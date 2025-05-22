/**
 * Service de sauvegarde des ressources pédagogiques
 */
import api from '../../../services/api';
import { formatErrorMessage } from '../utils/formatters';

/**
 * Sauvegarde une ressource pédagogique
 * @param {Object} resource - La ressource à sauvegarder
 * @param {string|number} sessionId - ID de la session
 * @returns {Promise<Object>} - Résultat de la sauvegarde
 */
export const saveResource = async (resource, sessionId) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error("Token d'authentification manquant");

  console.log(`[saveResource] Sauvegarde de la ressource ${resource.suggestion.type_key}/${resource.suggestion.subtype_key}`);
  
  // Récupérer l'URL HTML générée lors de la fusion
  const htmlContent = resource.mergedHtml || resource.html_url;
  
  if (!htmlContent) {
    throw new Error(`Aucun contenu HTML disponible pour la ressource ${resource.suggestion.type_key}/${resource.suggestion.subtype_key}`); 
  }
  
  console.log(`[saveResource] URL HTML à enregistrer: ${htmlContent}`);
  
  // Conversion des types et sous-types en ID pour le backend
  // Comme dans ProposeWorks.js
  let typeId = 4; // Valeur par défaut pour oeuvre
  let subTypeId = 7; // Valeur par défaut pour extrait
  
  // Mappings spécifiques selon le type/sous-type
  if (resource.suggestion.type_key === 'exercice') {
    typeId = 1;
    
    // Sous-types d'exercice
    if (resource.suggestion.subtype_key === 'vocabulaire') {
      subTypeId = 1;
    } else if (resource.suggestion.subtype_key === 'champlex') {
      subTypeId = 3;
    } else if (resource.suggestion.subtype_key === 'champlex2') {
      subTypeId = 4;
    } else if (resource.suggestion.subtype_key === 'qcm') {
      subTypeId = 5;
    }
  } else if (resource.suggestion.type_key === 'oeuvre') {
    typeId = 4;
    
    // Sous-types d'oeuvre
    if (resource.suggestion.subtype_key === 'extrait') {
      subTypeId = 7;
    } else if (resource.suggestion.subtype_key === 'oeuvrecomp') {
      subTypeId = 8;
    }
  }
  
  console.log(`[saveResource] Type mapping: ${resource.suggestion.type_key} -> ${typeId}, ${resource.suggestion.subtype_key} -> ${subTypeId}`);
  
  // Le problème est que nous utilisons FormData mais l'endpoint attend du JSON
  // Essayons d'envoyer les données directement comme des champs dans l'URL en utilisant URLSearchParams
  const params = new URLSearchParams();
  params.append('title', resource.suggestion.title || `${resource.suggestion.type_key} - ${resource.suggestion.subtype_key}`);
  params.append('description', resource.data ? JSON.stringify(resource.data) : '');
  params.append('type_id', typeId);
  params.append('sub_type_id', subTypeId);
  params.append('html_path', htmlContent);
  params.append('source_type', 'ai');
  params.append('session_ids_json', `[${sessionId}]`);
  params.append('objective_ids_json', '[]');
  params.append('study_object_ids_json', '[]');
  
  console.log(`[saveResource] Données préparées pour l'envoi:`, {
    title: params.get('title'),
    description: params.get('description') ? params.get('description').substring(0, 50) + '...' : '',
    type_id: params.get('type_id'),
    sub_type_id: params.get('sub_type_id'),
    html_path: params.get('html_path'),
    source_type: params.get('source_type'),
    session_ids_json: params.get('session_ids_json'),
    objective_ids_json: params.get('objective_ids_json'),
    study_object_ids_json: params.get('study_object_ids_json')
  });

  console.log(`[saveResource] Envoi des données en x-www-form-urlencoded`);

  // Envoi des données avec content-type application/x-www-form-urlencoded
  const response = await api.post(
    `/resources`, 
    params, 
    { 
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      } 
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
export const saveAllResources = async (resources, sessionId, onStatusUpdate, onComplete) => {
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
      
      const savedResource = await saveResource(resource, sessionId);
      createdResources.push(savedResource);
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
