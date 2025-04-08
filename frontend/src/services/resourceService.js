import axios from 'axios';
import authService from './auth'; // Garder l'import si d'autres fonctions d'authService sont utilisées ailleurs

// Récupérer l'URL de base de l'API depuis les variables d'environnement
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000'; // Fallback pour sécurité
const API_URL = `${API_BASE_URL}/api/v1/resources`; // CORRIGÉ: URL absolue du backend

// Configuration de l'intercepteur pour les tokens
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // CORRIGÉ: Utiliser localStorage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Fonction pour récupérer UNE ressource par son ID
const getResourceById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`); // Appelle GET /api/v1/resources/{id}
  return response.data;
};

const resourceService = {
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
  },

  getResourceById, // Exporter la nouvelle fonction
};

export default resourceService;
