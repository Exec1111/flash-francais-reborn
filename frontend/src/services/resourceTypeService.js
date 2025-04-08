import axios from 'axios';

// Récupérer l'URL de base de l'API depuis les variables d'environnement
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000'; // Fallback
const API_URL = `${API_BASE_URL}/api/v1/resource-types`;

// Configuration de l'intercepteur pour les tokens
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const resourceTypeService = {
  // Récupérer tous les types de ressources
  getAllTypes: async () => {
    try {
      const response = await axios.get(`${API_URL}/types`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer un type de ressource avec ses sous-types
  getTypeWithSubtypes: async (typeId) => {
    try {
      const response = await axios.get(`${API_URL}/types/${typeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer tous les sous-types de ressources
  getAllSubtypes: async () => {
    try {
      const response = await axios.get(`${API_URL}/subtypes`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer les sous-types pour un type spécifique
  getSubtypesByType: async (typeId) => {
    try {
      const response = await axios.get(`${API_URL}/subtypes?type_id=${typeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer un sous-type spécifique
  getSubtype: async (subtypeId) => {
    try {
      const response = await axios.get(`${API_URL}/subtypes/${subtypeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default resourceTypeService;
