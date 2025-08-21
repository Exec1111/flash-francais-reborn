/**
 * Service de sauvegarde des ressources pédagogiques
 */
import api from '../../../services/api';
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
  const token = localStorage.getItem('token');
  if (!token) throw new Error("Token d'authentification manquant");

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
  
  // Le problème est que nous utilisons FormData mais l'endpoint attend du JSON
  // Essayons d'envoyer les données directement comme des champs dans l'URL en utilisant URLSearchParams
  const params = new URLSearchParams();
  params.append('title', resource.suggestion.title || `${resource.suggestion.type_key} - ${resource.suggestion.subtype_key}`);
  params.append('description', resource.data ? JSON.stringify(resource.data) : '');
  params.append('type_id', typeId);
  if (subTypeId !== null && subTypeId !== undefined) {
    params.append('sub_type_id', subTypeId);
  }
  params.append('html_path', htmlContent);
  params.append('source_type', 'ai');
  params.append('session_id', sessionId);
  params.append('session_ids_json', `[${sessionId}]`);
  params.append('objective_ids_json', '[]');
  // Lier la ressource à l'œuvre sélectionnée si présente
  if (supportId) {
    try {
      const normalized = Array.isArray(supportId) ? supportId : [supportId];
      const ids = normalized
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id));
      if (ids.length > 0) {
        params.append('oeuvre_ids_json', JSON.stringify(ids));
      }
    } catch (_) {
      // En cas d'erreur de normalisation, ne rien envoyer
    }
  }
  // NOTE: Ne plus envoyer "study_object_ids_json" depuis le frontend.
  
  console.log(`[saveResource] Données préparées pour l'envoi:`, {
    title: params.get('title'),
    description: params.get('description') ? params.get('description').substring(0, 50) + '...' : '',
    type_id: params.get('type_id'),
    sub_type_id: params.get('sub_type_id'),
    html_path: params.get('html_path'),
    source_type: params.get('source_type'),
    session_ids_json: params.get('session_ids_json'),
    objective_ids_json: params.get('objective_ids_json'),
    oeuvre_ids_json: params.get('oeuvre_ids_json'),
  });

  console.log(`[saveResource] Envoi des données en x-www-form-urlencoded`);

  // Envoi des données avec content-type application/x-www-form-urlencoded
  const response = await api.post(
    `/resources/`, // Ajout du slash final
    params, 
    { 
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      // Timeout de sécurité pour éviter un blocage indéfini côté UI
      timeout: 60000
    }
  );

  console.log(`[saveResource] Réponse:`, response.data);
  
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
