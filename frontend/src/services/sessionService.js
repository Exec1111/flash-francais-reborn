import api from './api';

const sessionService = {
  /**
   * Récupère une séance par son ID
   * @param {number} id - ID de la séance
   * @returns {Promise<Object>} - Données de la séance
   */
  getSessionById: async (id) => {
    try {
      const response = await api.get(`/sessions/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération de la séance" };
    }
  },
  // Tu pourras ajouter d'autres méthodes ici si besoin
};

export default sessionService;
