import api from './api';

const oeuvreService = {
  // Récupérer toutes les œuvres avec pagination et filtres
  getOeuvres: async (params = {}) => {
    const {
      skip = 0,
      limit = 20,
      search = '',
      type_filter = '',
      genre_filter = '',
      public_only = false
    } = params;

    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(type_filter && { type_filter }),
      ...(genre_filter && { genre_filter }),
      public_only: public_only.toString()
    });

    const response = await api.get(`/oeuvres?${queryParams}`);
    return response.data;
  },

  // Récupérer les œuvres publiques (sans authentification)
  getPublicOeuvres: async (params = {}) => {
    const {
      skip = 0,
      limit = 20,
      search = '',
      type_filter = '',
      genre_filter = ''
    } = params;

    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(type_filter && { type_filter }),
      ...(genre_filter && { genre_filter })
    });

    const response = await api.get(`/oeuvres/public?${queryParams}`);
    return response.data;
  },

  // Récupérer une œuvre par son ID
  getOeuvre: async (id) => {
    const response = await api.get(`/oeuvres/${id}`);
    return response.data;
  },

  // Créer une nouvelle œuvre
  createOeuvre: async (oeuvreData) => {
    const response = await api.post('/oeuvres', oeuvreData);
    return response.data;
  },

  // Mettre à jour une œuvre
  updateOeuvre: async (id, oeuvreData) => {
    const response = await api.patch(`/oeuvres/${id}`, oeuvreData);
    return response.data;
  },

  // Supprimer une œuvre
  deleteOeuvre: async (id) => {
    await api.delete(`/oeuvres/${id}`);
  },

  // Récupérer les œuvres par type
  getOeuvresByType: async (type) => {
    const response = await api.get(`/oeuvres/by_type/${encodeURIComponent(type)}`);
    return response.data;
  },

  // Récupérer les œuvres par auteur
  getOeuvresByAuteur: async (nomAuteur) => {
    const response = await api.get(`/oeuvres/by_auteur/${encodeURIComponent(nomAuteur)}`);
    return response.data;
  },

  // Rechercher des œuvres
  searchOeuvres: async (query, limit = 10) => {
    const response = await api.get(`/oeuvres/search/${encodeURIComponent(query)}?limit=${limit}`);
    return response.data;
  },

  // Récupérer les types d'œuvres disponibles
  getTypesOeuvres: async () => {
    const response = await api.get('/oeuvres/metadata/types');
    return response.data;
  },

  // Récupérer les genres d'œuvres disponibles
  getGenresOeuvres: async () => {
    const response = await api.get('/oeuvres/metadata/genres');
    return response.data;
  },

  // Génération d'œuvre par IA
  generateOeuvreAI: async (data) => {
    const response = await api.post('/oeuvres/generate', data);
    return response.data;
  },

  // Gestion des ressources liées aux œuvres
  addResourceToOeuvre: async (oeuvreId, resourceId) => {
    const response = await api.post(`/oeuvres/${oeuvreId}/resources/${resourceId}`);
    return response.data;
  },

  removeResourceFromOeuvre: async (oeuvreId, resourceId) => {
    const response = await api.delete(`/oeuvres/${oeuvreId}/resources/${resourceId}`);
    return response.data;
  },

  getOeuvresByResource: async (resourceId) => {
    const response = await api.get(`/oeuvres/by-resource/${resourceId}`);
    return response.data;
  },
};

export default oeuvreService;
