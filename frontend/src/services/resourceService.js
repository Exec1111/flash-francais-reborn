import axios from 'axios';
import authService from './auth';

const API_URL = '/api/resources';

// Configuration de l'intercepteur pour les tokens
axios.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const resourceService = {
  // Récupérer toutes les ressources
  getAll: async () => {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Créer une nouvelle ressource
  create: async (resourceData) => {
    try {
      const response = await axios.post(API_URL, resourceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mettre à jour une ressource
  update: async (id, resourceData) => {
    try {
      const response = await axios.put(`${API_URL}/${id}`, resourceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Supprimer une ressource
  delete: async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
    } catch (error) {
      throw error;
    }
  },

  // Obtenir une ressource par ID
  getById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default resourceService;
