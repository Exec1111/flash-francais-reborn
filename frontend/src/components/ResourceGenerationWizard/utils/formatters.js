/**
 * Utilitaires de formatage pour le wizard de génération de ressources
 */

/**
 * Formate un message d'erreur à partir d'une erreur et d'un message par défaut
 * @param {Error} err - L'erreur à formater
 * @param {string} defaultMessage - Message par défaut si l'erreur n'a pas de message
 * @returns {string} Le message d'erreur formaté
 */
export const formatErrorMessage = (err, defaultMessage = "Une erreur est survenue") => {
  if (err.response && err.response.data && err.response.data.detail) {
    return `${defaultMessage}: ${err.response.data.detail}`;
  } else if (err.message) {
    return `${defaultMessage}: ${err.message}`;
  }
  return defaultMessage;
};

/**
 * Convertit un ID de session en nombre si c'est une chaîne
 * @param {string|number} sessionId - L'ID de session à convertir
 * @returns {number} L'ID de session converti en nombre
 */
export const convertSessionId = (sessionId) => {
  return typeof sessionId === 'string' ? parseInt(sessionId, 10) : sessionId;
};
