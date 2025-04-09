import axios from 'axios';

// Configuration de base d'axios
// Lire l'URL de BASE du backend (sans /api/v1)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000';

// Construire l'URL complète pour la baseURL d'Axios
const API_URL = `${API_BASE_URL}/api/v1`;

// Création d'une instance axios avec une configuration par défaut
const api = axios.create({
  baseURL: API_URL, // Utilise maintenant l'URL complète construite
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si l'erreur est 401 (non autorisé), on redirige vers la page de connexion
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
