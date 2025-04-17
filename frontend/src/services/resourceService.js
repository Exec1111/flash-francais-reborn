import axios from 'axios';
import api from './api';
import authService from './auth'; // Garder l'import si d'autres fonctions d'authService sont utilisées ailleurs

// Configuration de l'intercepteur pour les tokens
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // CORRIGÉ: Utiliser localStorage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const RESOURCE_ENDPOINT = '/resources';

const resourceService = {
  // Récupérer toutes les ressources
  getAll: async () => {
    try {
      const response = await api.get(RESOURCE_ENDPOINT);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Créer une nouvelle ressource
  create: async (resourceData) => {
    try {
      const response = await api.post(RESOURCE_ENDPOINT, resourceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mettre à jour une ressource
  update: async (id, resourceData) => {
    try {
      const response = await api.put(`${RESOURCE_ENDPOINT}/${id}`, resourceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Supprimer une ressource
  delete: async (id) => {
    try {
      await api.delete(`${RESOURCE_ENDPOINT}/${id}`);
    } catch (error) {
      throw error;
    }
  },

  // Obtenir une ressource par ID
  getById: async (id) => {
    try {
      const response = await api.get(`${RESOURCE_ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fonction pour récupérer UNE ressource par son ID
  getResourceById: async (id) => {
    const response = await api.get(`${RESOURCE_ENDPOINT}/${id}`);
    return response.data;
  },
};

export default resourceService;
