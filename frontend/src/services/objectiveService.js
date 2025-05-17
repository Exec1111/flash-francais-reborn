import api from './api';
import paginationConfig from '../config/pagination';

// URL de base pour les objectifs
const OBJECTIVES_ENDPOINT = '/objectives';

// Service pour la gestion des objectifs
const objectiveService = {
  /**
   * Crée un nouvel objectif
   * @param {Object} objectiveData - Données de l'objectif
   * @returns {Promise} - Promesse avec la réponse
   */
  createObjective: async (objectiveData) => {
    try {
      const response = await api.post(OBJECTIVES_ENDPOINT, objectiveData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la création de l'objectif" };
    }
  },

  /**
   * Récupère tous les objectifs
   * @param {number} skip - Nombre d'éléments à sauter (pagination)
   * @param {number} limit - Nombre d'éléments à récupérer (pagination)
   * @returns {Promise} - Promesse avec la réponse
   */
  getObjectives: async (skip = 0, limit = paginationConfig.objectives.itemsPerPage) => {
    try {
      const response = await api.get(`${OBJECTIVES_ENDPOINT}?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération des objectifs" };
    }
  },

  /**
   * Récupère un objectif par son ID
   * @param {number} id - ID de l'objectif
   * @returns {Promise} - Promesse avec la réponse
   */
  getObjectiveById: async (id) => {
    try {
      const response = await api.get(`${OBJECTIVES_ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération de l'objectif" };
    }
  },

  /**
   * Met à jour un objectif existant
   * @param {number} id - ID de l'objectif
   * @param {Object} objectiveData - Données mises à jour de l'objectif
   * @returns {Promise} - Promesse avec la réponse
   */
  updateObjective: async (id, objectiveData) => {
    try {
      const response = await api.put(`${OBJECTIVES_ENDPOINT}/${id}`, objectiveData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la mise à jour de l'objectif" };
    }
  },

  /**
   * Supprime un objectif
   * @param {number} id - ID de l'objectif
   * @returns {Promise} - Promesse avec la réponse
   */
  deleteObjective: async (id) => {
    try {
      await api.delete(`${OBJECTIVES_ENDPOINT}/${id}`);
      return true;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la suppression de l'objectif" };
    }
  },

  /**
   * Récupère les objectifs associés à une séquence
   * @param {number} sequenceId - ID de la séquence
   * @returns {Promise} - Promesse avec la réponse
   */
  getObjectivesBySequence: async (sequenceId) => {
    try {
      const response = await api.get(`${OBJECTIVES_ENDPOINT}/by_sequence/${sequenceId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération des objectifs pour cette séquence" };
    }
  },

  /**
   * Récupère les objectifs associés à une séance
   * @param {number} sessionId - ID de la séance
   * @returns {Promise} - Promesse avec la réponse
   */
  getObjectivesBySession: async (sessionId) => {
    try {
      const response = await api.get(`${OBJECTIVES_ENDPOINT}/by_session/${sessionId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération des objectifs pour cette séance" };
    }
  },

  /**
   * Associe un objectif à une séquence
   * @param {number} sequenceId - ID de la séquence
   * @param {number} objectiveId - ID de l'objectif
   * @returns {Promise} - Promesse avec la réponse
   */
  linkObjectiveToSequence: async (sequenceId, objectiveId) => {
    try {
      await api.post(`${OBJECTIVES_ENDPOINT}/sequences/${sequenceId}/objectives/${objectiveId}`);
      return true;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de l'association de l'objectif à la séquence" };
    }
  },

  /**
   * Dissocie un objectif d'une séquence
   * @param {number} sequenceId - ID de la séquence
   * @param {number} objectiveId - ID de l'objectif
   * @returns {Promise} - Promesse avec la réponse
   */
  unlinkObjectiveFromSequence: async (sequenceId, objectiveId) => {
    try {
      await api.delete(`${OBJECTIVES_ENDPOINT}/sequences/${sequenceId}/objectives/${objectiveId}`);
      return true;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la dissociation de l'objectif de la séquence" };
    }
  },

  /**
   * Associe un objectif à une séance
   * @param {number} sessionId - ID de la séance
   * @param {number} objectiveId - ID de l'objectif
   * @returns {Promise} - Promesse avec la réponse
   */
  linkObjectiveToSession: async (sessionId, objectiveId) => {
    try {
      await api.post(`${OBJECTIVES_ENDPOINT}/sessions/${sessionId}/objectives/${objectiveId}`);
      return true;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de l'association de l'objectif à la séance" };
    }
  },

  /**
   * Dissocie un objectif d'une séance
   * @param {number} sessionId - ID de la séance
   * @param {number} objectiveId - ID de l'objectif
   * @returns {Promise} - Promesse avec la réponse
   */
  unlinkObjectiveFromSession: async (sessionId, objectiveId) => {
    try {
      await api.delete(`${OBJECTIVES_ENDPOINT}/sessions/${sessionId}/objectives/${objectiveId}`);
      return true;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la dissociation de l'objectif de la séance" };
    }
  },
  
  /**
   * Récupère plusieurs objectifs par leurs IDs
   * @param {Array<number>} objectiveIds - Tableau d'IDs des objectifs à récupérer
   * @returns {Promise} - Promesse avec la réponse
   */
  getObjectivesByIds: async (objectiveIds) => {
    try {
      if (!objectiveIds || objectiveIds.length === 0) {
        return [];
      }
      const response = await api.post(`${OBJECTIVES_ENDPOINT}/by_ids`, { objective_ids: objectiveIds });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des objectifs par IDs:", error);
      // En cas d'erreur, nous récupérons les objectifs un par un comme solution de secours
      try {
        const objectives = await Promise.all(
          objectiveIds.map(id => objectiveService.getObjectiveById(id).catch(() => null))
        );
        return objectives.filter(obj => obj !== null);
      } catch (fallbackError) {
        console.error("Erreur lors de la récupération des objectifs par IDs (fallback):", fallbackError);
        throw error.response?.data || { detail: "Erreur lors de la récupération des objectifs par leurs IDs" };
      }
    }
  }
};

export default objectiveService;
