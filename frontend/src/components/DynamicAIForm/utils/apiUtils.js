/**
 * Utilitaires pour les appels API et la gestion des erreurs
 */

// L'URL de base de l'API
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

/**
 * Crée une instance d'API fetch avec la configuration commune
 * 
 * @returns {Object} Instance API configurée
 */
export const createApiInstance = () => {
  // Ici on utilise fetch comme instance de base
  return fetch;
};

/**
 * Effectue un appel API GET
 * 
 * @param {string} endpoint - Point de terminaison de l'API
 * @param {Object} options - Options supplémentaires pour la requête
 * @returns {Promise} Promesse résolue avec les données de la réponse
 */
export const apiGet = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error("Aucun jeton d'authentification trouvé");
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: { 
      ...options.headers,
      'Authorization': `Bearer ${token}` 
    },
    ...options
  });
  
  if (!response.ok) {
    await handleErrorResponse(response);
  }
  
  return response.json();
};

/**
 * Effectue un appel API POST
 * 
 * @param {string} endpoint - Point de terminaison de l'API
 * @param {Object} data - Données à envoyer
 * @param {Object} options - Options supplémentaires pour la requête
 * @returns {Promise} Promesse résolue avec les données de la réponse
 */
export const apiPost = async (endpoint, data, options = {}) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error("Aucun jeton d'authentification trouvé");
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers 
    },
    body: JSON.stringify(data),
    ...options
  });
  
  if (!response.ok) {
    await handleErrorResponse(response);
  }
  
  return response.json();
};

/**
 * Gère les réponses d'erreur des API
 * 
 * @param {Response} response - Réponse HTTP
 * @throws {Error} Erreur formatée avec les détails
 */
export const handleErrorResponse = async (response) => {
  let errorMessage = `Erreur ${response.status}`;
  
  try {
    const errorData = await response.json();
    
    if (errorData.detail) {
      errorMessage = errorData.detail;
    } else if (errorData.message) {
      errorMessage = errorData.message;
    }
  } catch (e) {
    // Si la réponse n'est pas du JSON valide, utiliser le texte brut
    try {
      errorMessage = await response.text();
    } catch (textError) {
      // Conserver le message par défaut si tout échoue
    }
  }
  
  const error = new Error(errorMessage);
  error.status = response.status;
  throw error;
};

/**
 * Extrait les détails d'une erreur pour l'affichage
 * 
 * @param {Error} error - L'erreur à analyser
 * @returns {string} Message d'erreur détaillé
 */
export const getDetailedError = (error) => {
  try {
    if (error.detail) {
      return error.detail;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return "Une erreur inconnue est survenue";
  } catch (e) {
    return "Erreur lors du traitement de l'erreur";
  }
};

/**
 * Vérifie si une erreur est liée à l'authentification
 * 
 * @param {Error} error - L'erreur à vérifier
 * @returns {boolean} Vrai si c'est une erreur d'authentification
 */
export const isAuthError = (error) => {
  return error && (error.status === 401 || error.status === 403);
};
