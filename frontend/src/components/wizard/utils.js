/**
 * Utilitaire pour formater les messages d'erreur de manière cohérente
 * @param {Error|string} err - L'erreur à formater
 * @param {string} baseMessage - Message de base à utiliser si aucun détail n'est disponible
 * @returns {string} Message d'erreur formaté
 */
export const formatErrorMessage = (err, baseMessage = "Une erreur est survenue") => {
  if (typeof err === 'string') return err; // Si c'est déjà une chaîne, la retourner

  let descriptiveMessage = baseMessage;

  if (err && err.response && err.response.data) {
    const data = err.response.data;
    let detail = data.detail || data; // FastAPI met souvent les détails dans .detail

    if (typeof detail === 'string') {
      descriptiveMessage = detail;
    } else if (Array.isArray(detail) && detail.length > 0 && detail[0].msg && detail[0].loc) {
      // Cas typique d'erreur de validation Pydantic (tableau d'objets)
      const firstError = detail[0];
      descriptiveMessage = `Validation échouée: ${firstError.msg} (champ: ${firstError.loc.join(' -> ')})`;
    } else if (typeof detail === 'object' && detail.msg) {
      // Cas d'erreur Pydantic simple (objet unique)
      descriptiveMessage = `Validation échouée: ${detail.msg}`;
    } else {
      // Fallback si la structure est inattendue
      descriptiveMessage = JSON.stringify(detail);
    }
    return `${baseMessage}. Status: ${err.response.status || 'N/A'}. Détail: ${descriptiveMessage}`;
  } else if (err && err.message) {
    // Erreur JavaScript standard ou Axios sans réponse détaillée du serveur
    return `${baseMessage}: ${err.message}`;
  }
  
  return descriptiveMessage; // Retourne le message de base si aucune info plus précise n'est trouvée
};
