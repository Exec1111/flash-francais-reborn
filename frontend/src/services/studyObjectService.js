import api from './api';

const STUDY_OBJECTS_ENDPOINT = '/study_objects';

const studyObjectService = {
  getStudyObjects: async (skip = 0, limit = 100) => {
    try {
      const response = await api.get(`${STUDY_OBJECTS_ENDPOINT}?skip=${skip}&limit=${limit}`);
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

  attachResource: async (objId, resId) => {
    try {
      const response = await api.post(`${STUDY_OBJECTS_ENDPOINT}/${objId}/resources/${resId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Erreur lors de l\'association à la ressource' };
    }
  },

  detachResource: async (objId, resId) => {
    try {
      const response = await api.delete(`${STUDY_OBJECTS_ENDPOINT}/${objId}/resources/${resId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: 'Erreur lors de la dissociation de la ressource' };
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
  }
};

export default studyObjectService;
