import api from './api';

const AUTH_ENDPOINT = '/auth';

export const authService = {
  /**
   * Inscription d'un nouvel utilisateur
   * @param {Object} userData - Données de l'utilisateur
   * @returns {Promise} - Promesse avec la réponse
   */
  register: async (userData) => {
    try {
      const response = await api.post(`${AUTH_ENDPOINT}/register`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de l'inscription" };
    }
  },

  /**
   * Connexion d'un utilisateur
   * @param {string} email - Email de l'utilisateur
   * @param {string} password - Mot de passe de l'utilisateur
   * @returns {Promise} - Promesse avec la réponse
   */
  login: async (email, password) => {
    try {
      // L'API FastAPI attend un format spécifique pour OAuth2
      const formData = new FormData();
      formData.append('username', email); // FastAPI attend 'username' même si c'est un email
      formData.append('password', password);

      const response = await api.post(`${AUTH_ENDPOINT}/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Stockage du token et des informations utilisateur
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        
        // Récupération des informations de l'utilisateur
        const userInfo = await authService.getCurrentUser();
        localStorage.setItem('user', JSON.stringify(userInfo));
        
        return userInfo;
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la connexion" };
    }
  },

  /**
   * Récupération des informations de l'utilisateur connecté
   * @returns {Promise} - Promesse avec la réponse
   */
  getCurrentUser: async () => {
    try {
      const response = await api.get(`/auth/me`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la récupération des informations utilisateur" };
    }
  },

  /**
   * Déconnexion de l'utilisateur
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Vérification si l'utilisateur est connecté
   * @returns {boolean} - True si l'utilisateur est connecté
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  /**
   * Récupération de l'utilisateur depuis le localStorage
   * @returns {Object|null} - Informations de l'utilisateur ou null
   */
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Demande de réinitialisation de mot de passe
   * @param {string} email - Email de l'utilisateur
   * @returns {Promise} - Promesse avec la réponse
   */
  forgotPassword: async (email) => {
    try {
      const response = await api.post(`${AUTH_ENDPOINT}/forgot-password`, { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { detail: "Erreur lors de la demande de réinitialisation" };
    }
  }
};

export default authService;
