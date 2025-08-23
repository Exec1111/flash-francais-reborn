import api from './api';
import paginationConfig from '../config/pagination';

const STUDY_OBJECTS_ENDPOINT = '/study_objects';

const studyObjectService = {
  getStudyObjects: async (skip = 0, limit = paginationConfig.studyObjects.itemsPerPage, search = null) => {
    try {
      let url = `${STUDY_OBJECTS_ENDPOINT}?skip=${skip}&limit=${limit}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Erreur lors de la récupération des objets d\'étude' };
    }
  },

  getStudyObjectById: async (id) => {
    try {
      const response = await api.get(`${STUDY_OBJECTS_ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Erreur lors de la récupération de l\'objet d\'étude' };
    }
  },

  createStudyObject: async (data) => {
    try {
      const response = await api.post(STUDY_OBJECTS_ENDPOINT, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Erreur lors de la création de l\'objet d\'étude' };
    }
  },

  updateStudyObject: async (id, data) => {
    try {
      const response = await api.patch(`${STUDY_OBJECTS_ENDPOINT}/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Erreur lors de la mise à jour de l\'objet d\'étude' };
    }
  },

  deleteStudyObject: async (id) => {
    try {
      await api.delete(`${STUDY_OBJECTS_ENDPOINT}/${id}`);
      return true;
    } catch (error) {
      throw error.response?.data || { detail: 'Erreur lors de la suppression de l\'objet d\'étude' };
    }
  },

  attachProgression: async (objId, progId) => {
    try {
      const response = await api.post(`${STUDY_OBJECTS_ENDPOINT}/${objId}/progressions/${progId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Erreur lors de l\'association à la progression' };
    }
  },

  detachProgression: async (objId, progId) => {
    try {
      const response = await api.delete(`${STUDY_OBJECTS_ENDPOINT}/${objId}/progressions/${progId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Erreur lors de la dissociation de la progression' };
    }
  },

  // Nouvel endpoint : objets d'étude par progression
  getStudyObjectsByProgression: async (progressionId) => {
    try {
      const response = await api.get(`/study_objects/by_progression/${progressionId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération des objets d'étude pour la progression" };
    }
  },

  // Gestion des œuvres
  attachOeuvre: async (objId, oeuvreId) => {
    try {
      const response = await api.post(`${STUDY_OBJECTS_ENDPOINT}/${objId}/oeuvres/${oeuvreId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Erreur lors de l\'association à l\'œuvre' };
    }
  },

  detachOeuvre: async (objId, oeuvreId) => {
    try {
      const response = await api.delete(`${STUDY_OBJECTS_ENDPOINT}/${objId}/oeuvres/${oeuvreId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Erreur lors de la dissociation de l\'œuvre' };
    }
  },

  // Nouvel endpoint : objets d'étude par œuvre
  getStudyObjectsByOeuvre: async (oeuvreId) => {
    try {
      const response = await api.get(`/study_objects/by_oeuvre/${oeuvreId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération des objets d'étude pour l'œuvre" };
    }
  }
};

export default studyObjectService;
