import axios from 'axios';
import api from './api';

// Configuration de l'intercepteur pour les tokens
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const RESOURCE_TYPE_ENDPOINT = '/resource-types';

let cachedResourceTypeMappings = null;

export const resourceTypeService = {
  // Récupérer tous les types de ressources
  getAllTypes: async () => {
    try {
      const response = await api.get(`${RESOURCE_TYPE_ENDPOINT}/types`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer un type de ressource avec ses sous-types
  getTypeWithSubtypes: async (typeId) => {
    try {
      const response = await api.get(`${RESOURCE_TYPE_ENDPOINT}/types/${typeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer tous les sous-types de ressources
  getAllSubtypes: async () => {
    try {
      const response = await api.get(`${RESOURCE_TYPE_ENDPOINT}/subtypes`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer les sous-types pour un type spécifique
  getSubtypesByType: async (typeId) => {
    try {
      const response = await api.get(`${RESOURCE_TYPE_ENDPOINT}/subtypes?type_id=${typeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer un sous-type spécifique
  getSubtype: async (subtypeId) => {
    try {
      const response = await api.get(`${RESOURCE_TYPE_ENDPOINT}/subtypes/${subtypeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Nouvelle fonction pour charger et mettre en cache tous les types et sous-types structurés
  loadAndCacheResourceTypeMappings: async () => {
    if (cachedResourceTypeMappings) {
      return cachedResourceTypeMappings;
    }
    try {
      // On suppose que getAllTypes() (via /resource-types/types) retourne
      // une structure comme: [{ id, key, name, subtypes: [{ id, key, name }, ...] }, ...]
      const response = await api.get('/ai/resource-types'); // Appel direct au bon endpoint
      const mappings = response.data.types; // Extraire le tableau 'types' de la réponse 
      console.log('[resourceTypeService] Mappings chargés depuis API:', JSON.stringify(mappings, null, 2)); // Log des mappings chargés
      cachedResourceTypeMappings = mappings;
      return mappings;
    } catch (error) {
      console.error("Erreur lors du chargement et de la mise en cache des mappings de types de ressources:", error);
      throw error;
    }
  },

  // Nouvelle fonction pour trouver les IDs à partir des clés textuelles
  findTypeIdByKeys: (typeKey, subtypeKey) => {
    if (!cachedResourceTypeMappings) {
      console.warn("Les mappings de types de ressources ne sont pas encore chargés. Appelez loadAndCacheResourceTypeMappings d'abord.");
      // Idéalement, lever une erreur ou forcer le chargement ici, 
      // mais pour l'instant, retournons null pour indiquer le problème.
      return { typeId: null, subTypeId: null };
    }

    const typeObj = cachedResourceTypeMappings.find(t => t.key && t.key.toLowerCase() === typeKey.toLowerCase());
    if (!typeObj) {
      console.warn(`Type avec la clé '${typeKey}' non trouvé dans les mappings.`);
      return { typeId: null, subTypeId: null };
    }

    // Si subtypeKey n'est pas fourni ou est vide, on retourne juste l'ID du type principal
    if (!subtypeKey) {
        return { typeId: typeObj.id, subTypeId: null };
    }

    if (!typeObj.subtypes || !Array.isArray(typeObj.subtypes)) {
        console.warn(`Le type '${typeKey}' (ID: ${typeObj.id}) n'a pas de sous-types définis ou la structure est incorrecte.`);
        return { typeId: typeObj.id, subTypeId: null };
    }

    const subtypeObj = typeObj.subtypes.find(st => st.key && st.key.toLowerCase() === subtypeKey.toLowerCase());
    if (!subtypeObj) {
      console.warn(`Sous-type avec la clé '${subtypeKey}' non trouvé pour le type '${typeKey}'.`);
      return { typeId: typeObj.id, subTypeId: null }; // Retourne l'ID du type même si le sous-type n'est pas trouvé
    }

    return { typeId: typeObj.id, subTypeId: subtypeObj.id };
  }
};

export default resourceTypeService;
