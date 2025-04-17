import api from './api'; // Import the configured axios instance

/**
 * Sends a chat message and history to the backend AI endpoint.
 * 
 * @param {string} message - The new message from the user.
 * @param {Array<object>} history - The chat history (array of { role: 'user' | 'assistant', content: string }).
 * @returns {Promise<object>} - A promise that resolves with the AI's response (e.g., { response: '...' }).
 */
const sendChatMessage = async (message, history) => {
  try {
    // The base URL ('/api/v1') is already configured in the api instance
    const response = await api.post('/ai/chat', { message, history });
    return response.data; // The backend returns ChatOutput schema { response: "..." }
  } catch (error) {
    console.error("Error sending chat message:", error.response ? error.response.data : error.message);
    // Re-throw the error or handle it as needed by the UI component
    throw error;
  }
};

/**
 * Récupère tous les types de ressources AI disponibles.
 * 
 * @returns {Promise<object>} - Un objet contenant les types de ressources disponibles.
 */
const getResourceTypes = async () => {
  try {
    const response = await api.get('/ai/resource-types');
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des types de ressources:", error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Récupère le schéma des variables pour un type et sous-type spécifique.
 * 
 * @param {string} typeKey - La clé du type de ressource.
 * @param {string} subtypeKey - La clé du sous-type de ressource.
 * @returns {Promise<object>} - Le schéma des variables pour ce type.
 */
const getResourceTypeSchema = async (typeKey, subtypeKey) => {
  try {
    const response = await api.get(`/ai/resource-types/${typeKey}/${subtypeKey}/schema`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération du schéma:", error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Génère une ressource AI à partir des paramètres spécifiés.
 * 
 * @param {object} data - Objet contenant type_key, subtype_key et variables.
 * @returns {Promise<object>} - L'objet contenant le contenu généré.
 */
const generateResource = async (data) => {
  try {
    const response = await api.post('/ai/generate-resource', data);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la génération de ressource:", error.response ? error.response.data : error.message);
    throw error;
  }
};

export const aiService = {
  sendChatMessage,
  getResourceTypes,
  getResourceTypeSchema,
  generateResource
};
