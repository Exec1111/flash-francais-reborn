import axios from 'axios';
import api from './api';
import authService from './auth'; // Garder l'import si d'autres fonctions d'authService sont utilisées ailleurs
import paginationConfig from '../config/pagination';

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
  // Récupérer toutes les ressources avec pagination et filtres
  getAll: async (params = { skip: 0, limit: paginationConfig.resources.itemsPerPage, search: null, typeId: null, subTypeId: null }) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('skip', params.skip || 0);
      queryParams.append('limit', params.limit || paginationConfig.resources.itemsPerPage);
      if (params.search) {
        queryParams.append('search', params.search);
      }
      if (params.typeKey) { // Prioriser typeKey si présent
        queryParams.append('typeKey', params.typeKey);
      } else {
        // Sinon, utiliser typeId et subTypeId comme avant
        if (params.typeId) {
          queryParams.append('typeId', params.typeId);
        }
        if (params.subTypeId) {
          queryParams.append('subTypeId', params.subTypeId);
        }
      }
      const response = await api.get(`${RESOURCE_ENDPOINT}?${queryParams.toString()}`);
      return response.data; // Doit retourner { total: number, items: [] }
    } catch (error) {
      // Améliorer la gestion d'erreur pour donner plus de contexte
      console.error("Error fetching resources:", error.response?.data || error.message);
      throw error.response?.data || { detail: 'Erreur lors de la récupération des ressources' };
    }
  },

  // Créer une nouvelle ressource
  create: async (resourceData) => {
    try {
      const config = resourceData instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
      const response = await api.post(RESOURCE_ENDPOINT, resourceData, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mettre à jour une ressource
  update: async (id, resourceData) => {
    try {
      const configUpd = resourceData instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
      const response = await api.put(`${RESOURCE_ENDPOINT}/${id}`, resourceData, configUpd);
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

  // Récupérer les objets d'étude associés à une ressource
  getStudyObjects: async (resourceId) => {
    try {
      const response = await api.get(`${RESOURCE_ENDPOINT}/${resourceId}/study_objects`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer le statut d'extraction PDF (et contenu si ready)
  getPdfExtractionStatus: async (id) => {
    try {
      const response = await api.get(`${RESOURCE_ENDPOINT}/${id}/docling`);
      return response.data; // { status, document_markdown?, tables?, ... }
    } catch (error) {
      throw error;
    }
  },

  // Alias compatibilité: Docling → Extraction PDF
  getDoclingStatus: async (id) => {
    return resourceService.getPdfExtractionStatus(id);
  },

  // Relancer l'extraction PDF (ocr, force)
  reextractPdfExtraction: async (id, { ocr = false, force = false } = {}) => {
    try {
      const form = new FormData();
      form.append('ocr', String(ocr));
      form.append('force', String(force));
      const response = await api.post(`${RESOURCE_ENDPOINT}/${id}/reextract`, form);
      return response.data; // { status: 'pending' | ... }
    } catch (error) {
      throw error;
    }
  },

  // Alias compatibilité
  reextractDocling: async (id, opts = {}) => {
    return resourceService.reextractPdfExtraction(id, opts);
  },
};

export default resourceService;
