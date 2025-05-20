/**
 * Service de fusion des ressources pédagogiques avec leurs templates HTML
 */
import api from '../../../services/api';
import { formatErrorMessage } from '../utils/formatters';

/**
 * Fusionne une ressource avec son template HTML
 * @param {Object} resource - La ressource à fusionner
 * @returns {Promise<Object>} - Résultat de la fusion
 */
export const mergeResource = async (resource) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error("Token d'authentification manquant");

  console.log(`[mergeResource] Début de fusion pour ${resource.suggestion.type_key}/${resource.suggestion.subtype_key}`);
  
  const requestBody = {
    type_key: resource.suggestion.type_key,
    subtype_key: resource.suggestion.subtype_key,
    data_json: resource.data,
    model_path: resource.suggestion.model_path
  };

  console.log(`[mergeResource] Fusion de la ressource ${resource.suggestion.type_key}/${resource.suggestion.subtype_key} avec body:`, JSON.stringify(requestBody, null, 2));

  const response = await api.post(
    `/ai/merge-resource`, 
    requestBody, 
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log(`[mergeResource] Réponse pour ${resource.suggestion.type_key}/${resource.suggestion.subtype_key}:`, response.data);
  
  if (!response.data || !response.data.merged_html) {
    console.error(`[mergeResource] La réponse pour ${resource.suggestion.type_key}/${resource.suggestion.subtype_key} est vide ou invalide:`, response.data);
    throw new Error(`La réponse est vide ou invalide`);
  }

  return response.data;
};

/**
 * Fusionne toutes les ressources avec leurs templates HTML
 * @param {Array} resources - Liste des ressources à fusionner
 * @param {Function} onStatusUpdate - Callback pour mettre à jour le statut
 * @param {Function} onPreviewUpdate - Callback pour mettre à jour la prévisualisation
 * @param {Function} onComplete - Callback appelé à la fin de la fusion
 */
export const mergeAllResources = async (resources, onStatusUpdate, onPreviewUpdate, onComplete) => {
  console.log("[mergeAllResources] Début de la fusion de toutes les ressources");
  
  if (!resources || resources.length === 0) {
    console.error("[mergeAllResources] Aucune ressource à fusionner");
    onComplete && onComplete();
    return;
  }

  const mergedResources = [...resources];
  
  for (let i = 0; i < mergedResources.length; i++) {
    if (mergedResources[i].mergeStatus !== 'pending') {
      console.log(`[mergeAllResources] Ressource ${i} non traitée car statut: ${mergedResources[i].mergeStatus}`);
      continue;
    }

    mergedResources[i] = { ...mergedResources[i], mergeStatus: 'loading' };
    onStatusUpdate && onStatusUpdate([...mergedResources]);
    onPreviewUpdate && onPreviewUpdate('');

    try {
      const result = await mergeResource(mergedResources[i]);
      
      mergedResources[i] = {
        ...mergedResources[i],
        mergeStatus: 'success',
        mergedHtml: result.merged_html
      };
      
      onPreviewUpdate && onPreviewUpdate(result.merged_html);
    } catch (err) {
      console.error(`[mergeAllResources] Erreur lors de la fusion de ${mergedResources[i].suggestion.type_key}/${mergedResources[i].suggestion.subtype_key}:`, err);
      
      mergedResources[i] = {
        ...mergedResources[i],
        mergeStatus: 'error',
        error: formatErrorMessage(err, "Erreur lors de la fusion")
      };
      
      onPreviewUpdate && onPreviewUpdate('');
    }
    
    onStatusUpdate && onStatusUpdate([...mergedResources]);
  }
  
  console.log("[mergeAllResources] Fin de la fusion de toutes les ressources");
  onComplete && onComplete();
};
