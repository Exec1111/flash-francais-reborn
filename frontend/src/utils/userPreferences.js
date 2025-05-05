/**
 * Service de gestion des préférences utilisateur via cookies
 */
import { setCookie, getCookie } from './cookieUtils';

// Constantes pour les préférences
const VIEW_MODE_PREFIX = 'viewMode_';
const DEFAULT_VIEW_MODE = 'grid'; // Vue par défaut si aucune préférence n'est trouvée

/**
 * Enregistre la préférence de vue pour un type de liste
 * @param {string} listType - Type de liste (resources, objectives, studyObjects, etc.)
 * @param {string} viewMode - Mode de vue ('grid' ou 'table')
 */
export const saveViewPreference = (listType, viewMode) => {
  if (!listType || (viewMode !== 'grid' && viewMode !== 'table')) {
    console.error('Paramètres invalides pour enregistrer la préférence de vue');
    return;
  }
  
  setCookie(`${VIEW_MODE_PREFIX}${listType}`, viewMode);
};

/**
 * Récupère la préférence de vue pour un type de liste
 * @param {string} listType - Type de liste (resources, objectives, studyObjects, etc.)
 * @returns {string} - Mode de vue ('grid' ou 'table')
 */
export const getViewPreference = (listType) => {
  if (!listType) {
    console.error('Type de liste non spécifié pour récupérer la préférence de vue');
    return DEFAULT_VIEW_MODE;
  }
  
  const savedViewMode = getCookie(`${VIEW_MODE_PREFIX}${listType}`);
  return savedViewMode || DEFAULT_VIEW_MODE;
};

/**
 * Récupère toutes les préférences de vue
 * @returns {Object} - Objet avec les préférences de vue pour chaque type de liste
 */
export const getAllViewPreferences = () => {
  const preferences = {};
  const cookieString = document.cookie;
  const cookies = cookieString.split(';');
  
  cookies.forEach(cookie => {
    cookie = cookie.trim();
    if (cookie.startsWith(VIEW_MODE_PREFIX)) {
      const key = cookie.substring(VIEW_MODE_PREFIX.length, cookie.indexOf('='));
      const value = cookie.substring(cookie.indexOf('=') + 1);
      preferences[key] = value;
    }
  });
  
  return preferences;
};
