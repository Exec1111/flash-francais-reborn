import api from './api';

const API_URL = '/progressions'; // Chemin relatif à la baseURL d'axios

/**
 * Récupère une progression par son ID.
 * 
 * @param {string} progressionId - L'ID de la progression.
 * @param {string} token - Le jeton d'authentification.
 * @returns {Promise<Object>} - La progression récupérée.
 */
const getProgressionById = async (progressionId, token) => {
  const response = await api.get(`${API_URL}/${progressionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Crée une nouvelle progression.
 * 
 * @param {Object} progressionData - Les données de la progression à créer (ex: { title: '...', description: '...' }).
 * @param {string} token - Le jeton d'authentification.
 * @returns {Promise<Object>} - La progression créée.
 */
const createProgression = async (progressionData, token) => {
  const response = await api.post(API_URL, progressionData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Met à jour une progression existante.
 * 
 * @param {string} progressionId - L'ID de la progression à mettre à jour.
 * @param {Object} progressionData - Les données mises à jour.
 * @param {string} token - Le jeton d'authentification.
 * @returns {Promise<Object>} - La progression mise à jour.
 */
const updateProgression = async (progressionId, progressionData, token) => {
  const response = await api.put(`${API_URL}/${progressionId}`, progressionData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Supprime une progression.
 * 
 * @param {string} progressionId - L'ID de la progression à supprimer.
 * @param {string} token - Le jeton d'authentification.
 * @returns {Promise<Object>} - La réponse de la suppression.
 */
const deleteProgression = async (progressionId, token) => {
    const response = await api.delete(`${API_URL}/${progressionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};


const progressionService = {
  getProgressionById,
  createProgression,
  updateProgression,
  deleteProgression,
};

export default progressionService;
