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

/**
 * Cache pour les suggestions d'exercices par session.
 * Évite les appels redondants causés par StrictMode ou autres double-rendus.
 */
const _suggestionsCache = {};

/**
 * Récupère les suggestions d'exercices pour une session avec mise en cache.
 * 
 * @param {string|number} sessionId - L'ID de la session.
 * @param {Object} [config] - Paramètres de configuration pour les suggestions
 * @param {string} [config.niveau_classe] - Niveau de classe des élèves
 * @param {number} [config.nombre_ressources] - Nombre de ressources à suggérer
 * @param {Array} [config.type_resources] - Types d'exercices sélectionnés explicitement
 * @returns {Promise<object>} - Objet contenant les suggestions.
 */
const getSuggestions = async (sessionId, config = {}) => {
  // Clé de cache unique pour cette session et sa configuration
  const configKey = config.niveau_classe ? `_niveau=${config.niveau_classe}` : '';
  const countKey = config.nombre_ressources ? `_count=${config.nombre_ressources}` : '';
  const typesKey = config.type_resources && config.type_resources.length > 0 ? 
    `_types=${config.type_resources.map(t => `${t.type_key}_${t.subtype_key}`).join(',')}` : '';
  const cacheKey = `suggestions_${sessionId}${configKey}${countKey}${typesKey}`;
  const cacheTime = 30 * 1000; // 30 secondes en millisecondes
  
  // Vérifier si des données en cache valides existent
  if (_suggestionsCache[cacheKey] && Date.now() - _suggestionsCache[cacheKey].timestamp < cacheTime) {
    console.log(`[CACHE] Utilisation du cache pour les suggestions d'exercices de la session ${sessionId}`);
    return _suggestionsCache[cacheKey].data;
  }
  
  try {
    // Récupération du token pour authentification
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error("Authentification requise. Veuillez vous reconnecter.");
    }
    
    // Logs de débogage très détaillés
    console.log(`%c[API DEBUG] Appel API suggestions d'exercices pour session ${sessionId}`, 'background: #ff9800; color: white; font-weight: bold; padding: 2px 5px;');
    console.log('%cConfiguration envoyée:', 'font-weight: bold;', config);
    
    if (config.type_resources) {
      console.log('%cType resources détails:', 'color: #ff5722; font-weight: bold;', {
        estTableau: Array.isArray(config.type_resources),
        longueur: config.type_resources.length,
        valeurs: JSON.parse(JSON.stringify(config.type_resources)),
        stringifié: JSON.stringify(config.type_resources)
      });
    } else {
      console.log('%cType resources:', 'color: #ff5722;', 'Non défini');
    }

    // Format de l'en-tête pour l'API
    const headers = { Authorization: `Bearer ${token}` };
    console.log('%cEn-têtes:', 'font-weight: bold;', headers);

    // Appel API avec les données en format JSON
    const response = await api.post(`/ai/sessions/${sessionId}/suggest-exercises`, config, {
      headers: headers,
    });
    
    // Log de la réponse
    console.log('%cRéponse API:', 'color: #4caf50; font-weight: bold;', response.data);
    
    // Mise en cache des données
    _suggestionsCache[cacheKey] = {
      data: response.data,
      timestamp: Date.now()
    };
    
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des suggestions:", error.response ? error.response.data : error.message);
    throw error;
  }
};

export const aiService = {
  sendChatMessage,
  getResourceTypes,
  getResourceTypeSchema,
  generateResource,
  getSuggestions
};
