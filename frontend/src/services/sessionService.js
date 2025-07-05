import api from './api';

const sessionService = {
  /**
   * Récupère une séance par son ID
   * @param {number} id - ID de la séance
   * @returns {Promise<Object>} - Données de la séance
   */
  getSessionById: async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération de la séance" };
    }
  },
  /**
   * Attache ou remplace la fiche de séance
   * @param {number} sessionId
   * @param {number} resourceId
   */
  attachFiche: async (sessionId, resourceId) => {
    try {
      const token = localStorage.getItem('token');
      const resp = await api.post(`/sessions/${sessionId}/fiche/${resourceId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return resp.data;
    } catch (err) {
      throw err.response?.data || { detail: 'Erreur lors de l\'attachement de la fiche' };
    }
  },

  /**
   * Détache et supprime la fiche de séance
   * @param {number} sessionId
   */
  detachFiche: async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const resp = await api.delete(`/sessions/${sessionId}/fiche`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return resp.data;
    } catch (err) {
      throw err.response?.data || { detail: 'Erreur lors de la suppression de la fiche' };
    }
  },

  // Tu pourras ajouter d'autres méthodes ici si besoin
};

export default sessionService;
