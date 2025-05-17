import api from './api';
import paginationConfig from '../config/pagination';

// URL de base pour les séquences
const SEQUENCES_ENDPOINT = '/sequences';

// Service pour la gestion des séquences
const sequenceService = {
  /**
   * Crée une nouvelle séquence
   * @param {Object} sequenceData - Données de la séquence
   * @returns {Promise} - Promesse avec la réponse
   */
  createSequence: async (sequenceData) => {
    try {
      const response = await api.post(SEQUENCES_ENDPOINT, sequenceData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la création de la séquence" };
    }
  },

  /**
   * Récupère toutes les séquences
   * @param {number} skip - Nombre d'éléments à sauter (pagination)
   * @param {number} limit - Nombre d'éléments à récupérer (pagination)
   * @returns {Promise} - Promesse avec la réponse
   */
  getSequences: async (skip = 0, limit = paginationConfig.defaultItemsPerPage) => {
    try {
      const response = await api.get(`${SEQUENCES_ENDPOINT}?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération des séquences" };
    }
  },

  /**
   * Récupère les séquences d'une progression spécifique
   * @param {number} progressionId - ID de la progression
   * @param {number} skip - Nombre d'éléments à sauter (pagination)
   * @param {number} limit - Nombre d'éléments à récupérer (pagination)
   * @returns {Promise} - Promesse avec la réponse
   */
  getSequencesByProgression: async (progressionId, skip = 0, limit = 100) => {
    try {
      const response = await api.get(`${SEQUENCES_ENDPOINT}/by_progression/${progressionId}?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération des séquences pour cette progression" };
    }
  },

  /**
   * Récupère une séquence par son ID
   * @param {number} id - ID de la séquence
   * @returns {Promise} - Promesse avec la réponse
   */
  getSequenceById: async (id) => {
    try {
      const response = await api.get(`${SEQUENCES_ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération de la séquence" };
    }
  },

  /**
   * Met à jour une séquence existante
   * @param {number} id - ID de la séquence
   * @param {Object} sequenceData - Données mises à jour de la séquence
   * @returns {Promise} - Promesse avec la réponse
   */
  updateSequence: async (id, sequenceData) => {
    try {
      const response = await api.put(`${SEQUENCES_ENDPOINT}/${id}`, sequenceData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la mise à jour de la séquence" };
    }
  },

  /**
   * Supprime une séquence
   * @param {number} id - ID de la séquence
   * @returns {Promise} - Promesse avec la réponse
   */
  deleteSequence: async (id) => {
    try {
      await api.delete(`${SEQUENCES_ENDPOINT}/${id}`);
      return true;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la suppression de la séquence" };
    }
  },

  /**
   * Ajoute un objectif à une séquence
   * @param {number} sequenceId - ID de la séquence
   * @param {number} objectiveId - ID de l'objectif à ajouter
   * @returns {Promise} - Promesse avec la réponse
   */
  addObjectiveToSequence: async (sequenceId, objectiveId) => {
    try {
      const response = await api.post(`${SEQUENCES_ENDPOINT}/${sequenceId}/objectives/${objectiveId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de l'ajout de l'objectif à la séquence" };
    }
  },

  /**
   * Retire un objectif d'une séquence
   * @param {number} sequenceId - ID de la séquence
   * @param {number} objectiveId - ID de l'objectif à retirer
   * @returns {Promise} - Promesse avec la réponse
   */
  removeObjectiveFromSequence: async (sequenceId, objectiveId) => {
    try {
      const response = await api.delete(`${SEQUENCES_ENDPOINT}/${sequenceId}/objectives/${objectiveId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors du retrait de l'objectif de la séquence" };
    }
  },

  /**
   * Ajoute un objet d'étude à une séquence
   * @param {number} sequenceId - ID de la séquence
   * @param {number} studyObjectId - ID de l'objet d'étude à ajouter
   * @returns {Promise} - Promesse avec la réponse
   */
  addStudyObjectToSequence: async (sequenceId, studyObjectId) => {
    try {
      const response = await api.post(`${SEQUENCES_ENDPOINT}/${sequenceId}/study_objects/${studyObjectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de l'ajout de l'objet d'étude à la séquence" };
    }
  },

  /**
   * Retire un objet d'étude d'une séquence
   * @param {number} sequenceId - ID de la séquence
   * @param {number} studyObjectId - ID de l'objet d'étude à retirer
   * @returns {Promise} - Promesse avec la réponse
   */
  removeStudyObjectFromSequence: async (sequenceId, studyObjectId) => {
    try {
      const response = await api.delete(`${SEQUENCES_ENDPOINT}/${sequenceId}/study_objects/${studyObjectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors du retrait de l'objet d'étude de la séquence" };
    }
  }
};

export default sequenceService;
