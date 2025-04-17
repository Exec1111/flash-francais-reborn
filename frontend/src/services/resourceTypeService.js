import axios from 'axios';
import api from './api';

// Configuration de l'intercepteur pour les tokens
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const RESOURCE_TYPE_ENDPOINT = '/resource-types';

export const resourceTypeService = {
  // Récupérer tous les types de ressources
  getAllTypes: async () => {
    try {
      const response = await api.get(`${RESOURCE_TYPE_ENDPOINT}/types`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer un type de ressource avec ses sous-types
  getTypeWithSubtypes: async (typeId) => {
    try {
      const response = await api.get(`${RESOURCE_TYPE_ENDPOINT}/types/${typeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer tous les sous-types de ressources
  getAllSubtypes: async () => {
    try {
      const response = await api.get(`${RESOURCE_TYPE_ENDPOINT}/subtypes`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer les sous-types pour un type spécifique
  getSubtypesByType: async (typeId) => {
    try {
      const response = await api.get(`${RESOURCE_TYPE_ENDPOINT}/subtypes?type_id=${typeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer un sous-type spécifique
  getSubtype: async (subtypeId) => {
    try {
      const response = await api.get(`${RESOURCE_TYPE_ENDPOINT}/subtypes/${subtypeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default resourceTypeService;
