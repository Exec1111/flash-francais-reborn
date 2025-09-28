/**
 * Service de sauvegarde des ressources pédagogiques
 */
import resourceService from '../../../services/resourceService';
import { formatErrorMessage } from '../utils/formatters';
import { resourceTypeService } from '../../../services/resourceTypeService';

/**
 * Sauvegarde une ressource pédagogique
 * @param {Object} resource - La ressource à sauvegarder
 * @param {string} htmlContent - Le contenu HTML de la ressource
 * @param {string|number} sessionId - ID de la session
 * @param {string|number} [supportId] - ID de l'œuvre sélectionnée à l'étape de configuration (optionnel)
 * @returns {Promise<Object>} - Résultat de la sauvegarde
 */
export const saveResource = async (resource, htmlContent, sessionId, supportId) => {

  console.log(`[saveResource] Sauvegarde de la ressource ${resource.suggestion.type_key}/${resource.suggestion.subtype_key}`);

  // Récupérer l'URL HTML générée lors de la fusion
  // const htmlContent = resource.mergedHtml || resource.html_url;

  if (!htmlContent) {
    throw new Error(`Aucun contenu HTML disponible pour la ressource ${resource.suggestion.type_key}/${resource.suggestion.subtype_key}`);
  }

  console.log(`[saveResource] URL HTML à enregistrer: ${htmlContent}`);

  // Charger les mappings de types et sous-types
  // TODO: Optimisation - Appeler loadAndCacheResourceTypeMappings une seule fois lors de l'initialisation du Wizard ou de l'application.
  await resourceTypeService.loadAndCacheResourceTypeMappings();

  const { type_key, subtype_key } = resource.suggestion;
  const { typeId, subTypeId } = resourceTypeService.findTypeIdByKeys(type_key, subtype_key);

  if (typeId === null) { // subTypeId peut être null si le type n'a pas de sous-type ou si non trouvé, mais typeId est essentiel.
    console.error(`[saveResource] IDs de type/sous-type non trouvés pour type: ${type_key}, sous-type: ${subtype_key}. Abandon de la sauvegarde.`);
    alert(`Erreur critique : Les identifiants pour le type de ressource '${type_key}' (et potentiellement le sous-type '${subtype_key}') n'ont pas pu être déterminés. La sauvegarde ne peut pas continuer. Veuillez vérifier la configuration des types de ressources ou contacter le support.`);
    return null; // Arrêter l'exécution pour éviter de sauvegarder des données incorrectes
  }

  console.log(`[saveResource] Mapping dynamique des IDs: Type '${type_key}' -> ID ${typeId}, Sous-type '${subtype_key || "N/A"}' -> ID ${subTypeId || 'N/A'}`);

  // Vérifier si c'est un type de ressource JSON-first
  const subtypeKeyNorm = (subtype_key || '').toLowerCase();
  const isJsonFirstResource = ['champlex2', 'champlex', 'qcm', 'pendu', 'quisuisje', 'textereconstitue'].includes(subtypeKeyNorm);

  console.log(`[saveResource] Type de ressource: ${subtypeKeyNorm}, JSON-first: ${isJsonFirstResource}`);

  // Préparation du FormData pour l'API
  const formData = new FormData();

  // Ajouter les informations de base de la ressource
  formData.append('title', resource.suggestion.title || `${resource.suggestion.type_key} - ${resource.suggestion.subtype_key}`);
  formData.append('description', resource.data ? JSON.stringify(resource.data) : '');
  formData.append('type_id', typeId);
  if (subTypeId !== null && subTypeId !== undefined) {
    formData.append('sub_type_id', subTypeId);
  }
  formData.append('html_path', htmlContent);
  formData.append('source_type', 'ai');
  formData.append('session_id', sessionId);
  formData.append('session_ids_json', `[${sessionId}]`);
  formData.append('objective_ids_json', '[]');

  // Lier la ressource à l'œuvre sélectionnée si présente
  if (supportId) {
    try {
      const normalized = Array.isArray(supportId) ? supportId : [supportId];
      const ids = normalized
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id));
      if (ids.length > 0) {
        formData.append('oeuvre_ids_json', JSON.stringify(ids));
      }
    } catch (_) {
      // En cas d'erreur de normalisation, ne rien envoyer
    }
  }

  // Pour les ressources JSON-first, ajouter le contenu AI généré
  if (isJsonFirstResource && resource.data) {
    try {
      formData.append('ai_content_json', JSON.stringify(resource.data));
      console.log(`[saveResource] Contenu JSON-first ajouté pour ${subtypeKeyNorm}:`, resource.data);
    } catch (error) {
      console.error(`[saveResource] Erreur lors de la sérialisation du contenu JSON-first:`, error);
    }
  }

  // NOTE: Ne plus envoyer "study_object_ids_json" depuis le frontend.

  console.log(`[saveResource] Données préparées pour l'envoi:`, {
    title: resource.suggestion.title,
    description: resource.data ? 'Données présentes' : 'Aucune donnée',
    type_id: typeId,
    sub_type_id: subTypeId,
    html_path: htmlContent,
    source_type: 'ai',
    session_ids_json: `[${sessionId}]`,
    objective_ids_json: '[]',
    oeuvre_ids_json: supportId ? `[${supportId}]` : '[]',
    isJsonFirst: isJsonFirstResource,
    hasAiContent: isJsonFirstResource && resource.data ? 'Oui' : 'Non'
  });

  console.log(`[saveResource] Envoi des données via resourceService.create`);

  // Utiliser resourceService.create qui gère automatiquement les headers pour FormData
  const response = await resourceService.create(formData);

  console.log(`[saveResource] Réponse complète:`, response);
  console.log(`[saveResource] Status:`, response.status);
  console.log(`[saveResource] Data:`, response.data);

  // Vérification supplémentaire de la réponse
  if (!response || !response.data) {
    console.error(`[saveResource] Réponse vide reçue du serveur:`, response);
    throw new Error('Réponse vide du serveur');
  }

  if (!response.data.id) {
    console.error(`[saveResource] ID manquant dans la réponse:`, response.data);
    console.error(`[saveResource] Clés disponibles dans response.data:`, Object.keys(response.data || {}));
    throw new Error(`ID de ressource manquant dans la réponse. Réponse reçue: ${JSON.stringify(response.data)}`);
  }

  console.log(`[saveResource] Ressource sauvegardée avec ID:`, response.data.id);
  console.log(`[saveResource] Ressource complète:`, response.data);

  return response.data;
};

/**
 * Sauvegarde toutes les ressources pédagogiques
 * @param {Array} resources - Liste des ressources à sauvegarder
 * @param {string|number} sessionId - ID de la session
 * @param {Function} onStatusUpdate - Callback pour mettre à jour le statut
 * @param {Function} onComplete - Callback appelé à la fin de la sauvegarde
 * @returns {Promise<Array>} - Liste des ressources sauvegardées
 */
export const saveAllResources = async (resources, sessionId, onStatusUpdate, onComplete, supportId) => {
  console.log("[saveAllResources] Début de la sauvegarde de toutes les ressources");
  console.log("[saveAllResources] Type de resources:", typeof resources);
  console.log("[saveAllResources] Resources reçues:", resources);
  
  // Vérification sécurisée que resources est un tableau
  if (!resources) {
    console.error("[saveAllResources] resources est null ou undefined");
    onComplete && onComplete([]);
    return [];
  }
  
  // Convertir en tableau si ce n'est pas déjà le cas (par exemple si c'est un objet)
  let resourcesArray = Array.isArray(resources) ? resources : [resources];
  
  if (resourcesArray.length === 0) {
    console.error("[saveAllResources] Aucune ressource à sauvegarder");
    onComplete && onComplete([]);
    return [];
  }

  const createdResources = [];
  
  for (const resource of resourcesArray) {
    try {
      // Vérifier que la ressource a les propriétés nécessaires
      if (!resource || !resource.suggestion || !resource.suggestion.type_key || !resource.suggestion.subtype_key) {
        console.error(`[saveAllResources] Ressource invalide:`, resource);
        continue; // Passer à la ressource suivante au lieu de planter complètement
      }
      
      const htmlPath = resource.html_path || resource.mergedHtml || resource.html_url; // Prioriser html_path, puis mergedHtml, puis html_url
      if (!htmlPath) {
        console.error(`[saveAllResources] Chemin HTML manquant pour la ressource:`, resource);
        continue; // Passer à la ressource suivante
      }
      const savedResource = await saveResource(resource, htmlPath, sessionId, supportId);
      // Ne conserver que les résultats valides pour éviter les valeurs nulles dans la suite
      if (savedResource) {
        createdResources.push(savedResource);
      } else {
        console.warn('[saveAllResources] saveResource a retourné une valeur nulle/undefined, ressource ignorée');
      }
    } catch (err) {
      console.error(`[saveAllResources] Erreur lors de la sauvegarde de ${resource?.suggestion?.type_key || 'inconnu'}/${resource?.suggestion?.subtype_key || 'inconnu'}:`, err);
      // Gérer l'erreur mais continuer avec les autres ressources
      // throw err; // Ne pas arrêter le processus complet pour une seule ressource
    }
  }
  
  console.log("[saveAllResources] Fin de la sauvegarde de toutes les ressources");
  onComplete && onComplete(createdResources);
  return createdResources;
};
