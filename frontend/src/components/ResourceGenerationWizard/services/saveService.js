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
  
  const requestBody = {
    session_id: sessionId,
    title: resource.suggestion.title || `${resource.suggestion.type_key} - ${resource.suggestion.subtype_key}`,
    type_key: resource.suggestion.type_key,
    subtype_key: resource.suggestion.subtype_key,
    content: resource.mergedHtml,
    data: resource.data
  };

  console.log(`[saveResource] Sauvegarde avec body:`, JSON.stringify(requestBody, null, 2));

  const response = await api.post(
    `/resources`, 
    requestBody, 
    { headers: { Authorization: `Bearer ${token}` } }
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
  
  if (!resources || resources.length === 0) {
    console.error("[saveAllResources] Aucune ressource à sauvegarder");
    onComplete && onComplete([]);
    return [];
  }

  const createdResources = [];
  
  for (const resource of resources) {
    try {
      const savedResource = await saveResource(resource, sessionId);
      createdResources.push(savedResource);
    } catch (err) {
      console.error(`[saveAllResources] Erreur lors de la sauvegarde de ${resource.suggestion.type_key}/${resource.suggestion.subtype_key}:`, err);
      throw err;
    }
  }
  
  console.log("[saveAllResources] Fin de la sauvegarde de toutes les ressources");
  onComplete && onComplete(createdResources);
  return createdResources;
};
