/**
 * Service de génération de ressources pédagogiques
 */
import api from '../../../services/api';
import { convertSessionId, formatErrorMessage } from '../utils/formatters';

/**
 * Génère une ressource pédagogique via l'API
 * @param {Object} suggestionDetail - Détails de la suggestion
 * @param {string|number} sessionId - ID de la session
 * @param {Object} configParams - Paramètres de configuration
 * @returns {Promise<Object>} - Données générées
 */
export const generateResource = async (suggestionDetail, sessionId, configParams) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error("Token d'authentification manquant");
  
  console.log(`[generateResource] Début de génération pour l'exercice: ${suggestionDetail.type_key}/${suggestionDetail.subtype_key}`);

  // Convertir sessionId en nombre si c'est une chaîne (car l'API attend probablement un nombre)
  const sessionIdValue = convertSessionId(sessionId);
  
  const variables = {
    session_id: sessionIdValue,
    ...(suggestionDetail.sequence_id && { sequence_id: suggestionDetail.sequence_id }),
    ...(suggestionDetail.title && { suggestion_title: suggestionDetail.title }),
    ...(suggestionDetail.parameters && suggestionDetail.parameters.reduce((acc, param) => {
      acc[param.name] = param.value;
      return acc;
    }, {})),
    niveau_classe: configParams.niveau_classe,
    num_variations: 1
  };
  
  console.log(`[generateResource] Paramètres 'variables' transmis pour ${suggestionDetail.type_key}/${suggestionDetail.subtype_key}:`, variables);

  const requestBody = {
    type_key: suggestionDetail.type_key,
    subtype_key: suggestionDetail.subtype_key,
    variables: variables
  };

  console.log(`[generateResource] Génération de la ressource ${suggestionDetail.type_key}/${suggestionDetail.subtype_key} avec body:`, JSON.stringify(requestBody, null, 2));

  const response = await api.post(
    `/ai/generate-resource`, 
    requestBody, 
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  console.log(`[generateResource] Réponse pour ${suggestionDetail.type_key}/${suggestionDetail.subtype_key}:`, response.data);
  
  if (!response.data || (typeof response.data === 'object' && Object.keys(response.data).length === 0)) {
    console.error(`[generateResource] La réponse pour ${suggestionDetail.type_key}/${suggestionDetail.subtype_key} est vide ou invalide:`, response.data);
    throw new Error(`La réponse est vide ou invalide`);
  }
  
  const processedData = response.data.content || response.data;
  console.log(`[generateResource] Données traitées pour ${suggestionDetail.type_key}/${suggestionDetail.subtype_key}:`, processedData);
  
  return processedData;
};

/**
 * Génère toutes les ressources en attente
 * @param {Array} generationStatus - Statut de génération des ressources
 * @param {string|number} sessionId - ID de la session
 * @param {Object} configParams - Paramètres de configuration
 * @param {Function} onStatusUpdate - Callback pour mettre à jour le statut
 * @param {Function} onComplete - Callback appelé à la fin de la génération
 */
export const generateAllResources = async (generationStatus, sessionId, configParams, onStatusUpdate, onComplete) => {
  console.log("[generateAllResources] FONCTION APPELÉE");
  console.log("[generateAllResources] Au début : generationStatus", JSON.stringify(generationStatus));
  console.log(`[generateAllResources] Configuration (configParams): niveau_classe=${configParams.niveau_classe}, nombre_ressources=${configParams.nombre_ressources}`);

  // Vérifier que generationStatus contient des éléments à traiter
  if (!generationStatus || generationStatus.length === 0) {
    console.error("[generateAllResources] generationStatus est vide ou non défini!");
    onComplete && onComplete();
    return;
  }

  const currentGenerationStatus = [...generationStatus]; // Travailler sur une copie de l'état actuel

  for (let i = 0; i < currentGenerationStatus.length; i++) {
    if (currentGenerationStatus[i].status !== 'pending') {
      console.log(`[generateAllResources] Suggestion ${i} non traitée car statut: ${currentGenerationStatus[i].status}`);
      continue; // Ne traiter que les suggestions en attente
    }

    const suggestionDetail = currentGenerationStatus[i].suggestion; // Récupérer la suggestion originale de l'item de statut

    currentGenerationStatus[i] = { ...currentGenerationStatus[i], status: 'loading' };
    onStatusUpdate && onStatusUpdate([...currentGenerationStatus]); // Mettre à jour l'état pour l'UI (montre 'loading')

    try {
      const processedData = await generateResource(suggestionDetail, sessionId, configParams);
      
      currentGenerationStatus[i] = { 
        ...currentGenerationStatus[i], 
        status: 'success', 
        data: processedData 
      };
    } catch (err) {
      console.error(`[generateAllResources] Erreur lors de la génération de ${suggestionDetail.type_key}/${suggestionDetail.subtype_key}:`, err);
      if (err.response) {
        console.error('[generateAllResources] Détails de la réponse d\'erreur:', {
          data: err.response.data,
          status: err.response.status,
          headers: err.response.headers
        });
      }
      currentGenerationStatus[i] = { 
        ...currentGenerationStatus[i], 
        status: 'error', 
        error: formatErrorMessage(err, "Erreur lors de la génération")
      };
    }
    onStatusUpdate && onStatusUpdate([...currentGenerationStatus]); // Mettre à jour l'état après chaque tentative
  }
  console.log("[generateAllResources] À la fin : generationStatus", JSON.stringify(currentGenerationStatus));
  onComplete && onComplete();
};
