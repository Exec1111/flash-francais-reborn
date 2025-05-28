/**
 * Utilitaires pour la gestion des formulaires dynamiques
 */

/**
 * Initialise les données du formulaire avec les valeurs par défaut du schéma
 * 
 * @param {Object} schema - Schéma du formulaire
 * @returns {Object} Données initiales du formulaire
 */
export const initializeFormData = (schema) => {
  if (!schema || !schema.fields) {
    return {};
  }
  
  const initialData = {};
  
  schema.fields.forEach(field => {
    if (field.default !== null && field.default !== undefined) {
      initialData[field.name] = field.default;
    } else if (field.type === 'array' || field.type === 'list') {
      initialData[field.name] = [];
    } else if (field.type === 'object') {
      initialData[field.name] = {};
    } else if (field.type === 'boolean') {
      initialData[field.name] = false;
    }
  });
  
  return initialData;
};

/**
 * Formate les données du formulaire pour l'API
 * 
 * @param {Object} formData - Données du formulaire
 * @param {string} typeKey - Clé du type de ressource
 * @param {string} subtypeKey - Clé du sous-type de ressource
 * @returns {Object} Données formatées pour l'API
 */
export const formatFormDataForApi = (formData, typeKey, subtypeKey) => {
  // Créer une copie pour éviter la mutation
  const apiData = { ...formData };
  
  // Ajouter les clés de type et sous-type
  const payload = {
    type_key: typeKey,
    subtype_key: subtypeKey,
    variables: apiData
  };
  
  // Nettoyer les données pour l'API
  cleanupFormData(payload.variables);
  
  return payload;
};

/**
 * Nettoie les données du formulaire (supprime les valeurs vides, etc.)
 * 
 * @param {Object} data - Données à nettoyer
 * @returns {Object} Données nettoyées
 */
export const cleanupFormData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Pour les tableaux
  if (Array.isArray(data)) {
    return data.filter(item => 
      item !== null && 
      item !== undefined && 
      (typeof item !== 'string' || item.trim() !== '')
    ).map(item => cleanupFormData(item));
  }
  
  // Pour les objets
  const cleanedData = { ...data };
  
  Object.entries(cleanedData).forEach(([key, value]) => {
    // Supprimer les valeurs vides ou null
    if (value === null || value === undefined) {
      delete cleanedData[key];
      return;
    }
    
    // Nettoyer les chaînes vides
    if (typeof value === 'string' && value.trim() === '') {
      delete cleanedData[key];
      return;
    }
    
    // Nettoyer récursivement les objets et tableaux
    if (typeof value === 'object') {
      cleanedData[key] = cleanupFormData(value);
      
      // Supprimer les objets/tableaux vides
      if (Array.isArray(cleanedData[key]) && cleanedData[key].length === 0) {
        delete cleanedData[key];
      } else if (
        !Array.isArray(cleanedData[key]) && 
        Object.keys(cleanedData[key]).length === 0
      ) {
        delete cleanedData[key];
      }
    }
  });
  
  return cleanedData;
};

/**
 * Vérifie si un champ est de type liste
 * 
 * @param {Object} field - Description du champ
 * @returns {boolean} Vrai si le champ est une liste
 */
export const isListField = (field) => {
  return field.type === 'array' || field.type === 'list';
};

/**
 * Extrait le titre et la description d'une ressource générée
 * 
 * @param {Object} content - Contenu généré
 * @returns {Object} Titre et description extraits
 */
export const extractResourceInfo = (content) => {
  if (!content) {
    return { title: 'Ressource sans titre', description: '' };
  }
  
  let title = 'Ressource sans titre';
  let description = '';
  
  // Si le contenu est une chaîne, utiliser comme titre
  if (typeof content === 'string') {
    // Essayer d'extraire un titre des premières lignes
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length > 0) {
      title = lines[0].replace(/^#\s*/, '').trim();
      
      if (lines.length > 1) {
        description = lines[1].trim();
      }
    }
    return { title, description };
  }
  
  // Si le contenu est un objet
  if (typeof content === 'object') {
    // Chercher des propriétés spécifiques pour le titre
    const titleKeys = ['titre', 'title', 'nom', 'name', 'heading'];
    for (const key of titleKeys) {
      if (content[key] && typeof content[key] === 'string') {
        title = content[key];
        break;
      }
    }
    
    // Chercher des propriétés spécifiques pour la description
    const descKeys = ['description', 'desc', 'resume', 'summary', 'content'];
    for (const key of descKeys) {
      if (content[key] && typeof content[key] === 'string') {
        description = content[key];
        break;
      }
    }
  }
  
  return { title, description };
};
