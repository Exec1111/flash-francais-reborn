import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour gérer la récupération et le traitement du schéma du formulaire
 * 
 * @param {Object} props - Les propriétés du composant parent
 * @param {string} props.typeKey - Clé du type de ressource
 * @param {string} props.subtypeKey - Clé du sous-type de ressource
 * @param {Object} props.prefilledData - Données préchargées pour le formulaire (optionnel)
 * @returns {Object} État et fonctions liés au schéma du formulaire
 */
const useFormSchema = ({ typeKey, subtypeKey, prefilledData }) => {
  const [formSchema, setFormSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAuthError, setShowAuthError] = useState(false);

  // L'URL de base de l'API
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

  // Fonction pour créer une instance d'axios
  const createAxiosInstance = () => {
    const instance = fetch;
    return instance;
  };

  const axiosInstance = createAxiosInstance();

  // Effet pour récupérer le schéma du formulaire lorsque les clés de type changent
  useEffect(() => {
    console.log('DEBUG [useFormSchema] useEffect déclenché avec typeKey:', typeKey, 'subtypeKey:', subtypeKey);
    if (typeKey && subtypeKey) {
      // Stocker les clés dans les données du formulaire
      setFormData(prevData => ({
        ...prevData,
        typeKey: typeKey,
        subtypeKey: subtypeKey
      }));
      fetchSchema();
    }
  }, [typeKey, subtypeKey]);

  // Effet pour utiliser les données préfillées lorsqu'elles sont fournies
  useEffect(() => {
    if (prefilledData && formSchema) {
      console.log('DEBUG [useFormSchema] Utilisation des données préfillées:', prefilledData);
      setFormData(prevData => ({
        ...prevData,
        ...prefilledData
      }));
    }
  }, [prefilledData, formSchema]);

  /**
   * Récupère le schéma du formulaire depuis l'API
   */
  const fetchSchema = async () => {
    console.log('DEBUG [useFormSchema] fetchSchema appelé avec typeKey:', typeKey, 'subtypeKey:', subtypeKey);
    try {
      setIsLoading(true);
      setError(null);
      const url = `${API_BASE_URL}/api/v1/ai/resource-types/${typeKey}/${subtypeKey}/schema`;
      console.log('[DEBUG][fetchSchema] URL:', url);
      
      try {
        const token = localStorage.getItem('token');
        console.log('[DEBUG][fetchSchema] Token actuel dans localStorage:', token);
        
        if (!token) {
          setError("Aucun jeton d'authentification trouvé. Veuillez vous reconnecter.");
          setShowAuthError(true);
          return;
        }
        
        const response = await axiosInstance(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const schema = await response.json();
        console.log('[DEBUG][fetchSchema] Schéma reçu:', schema);
        
        // S'assurer que les énumérations sont correctement préservées
        if (schema.fields && Array.isArray(schema.fields)) {
          schema.fields.forEach(field => {
            console.log(`[DEBUG] Traitement du champ ${field.name}:`, field);
            
            // Vérifier si ce champ contient des énumérations
            if (field.enum) {
              console.log(`[DEBUG] Le champ ${field.name} a une énumération:`, field.enum);
            }
            if (field.validations && field.validations.enum) {
              console.log(`[DEBUG] Le champ ${field.name} a une énumération dans validations:`, field.validations.enum);
            }
          });
        }
        
        const initialData = {};
        schema.fields.forEach(field => {
          if (field.default !== null && field.default !== undefined) {
            initialData[field.name] = field.default;
          }
        });
        
        setFormSchema(schema);
        setFormData(initialData);
      } catch (err) {
        console.error('[DEBUG][fetchSchema] Erreur:', err);
        handleApiError(err, 'Erreur lors de la récupération du schéma');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Gère les erreurs d'API de manière standardisée
   * 
   * @param {Error} err - L'erreur survenue
   * @param {string} contextMessage - Message de contexte pour l'erreur
   */
  const handleApiError = (err, contextMessage) => {
    console.error(`[ERROR] ${contextMessage}:`, err);
    
    if (err.status === 401 || err.status === 403) {
      setShowAuthError(true);
      setError("Votre session a expiré. Veuillez vous reconnecter.");
      return;
    }
    
    const errorDetail = getDetailedError(err);
    setError(`${contextMessage}: ${errorDetail}`);
  };

  /**
   * Extrait les détails d'une erreur pour l'affichage
   * 
   * @param {Error} error - L'erreur à analyser
   * @returns {string} Message d'erreur détaillé
   */
  const getDetailedError = (error) => {
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

  return { 
    formSchema, 
    formData, 
    setFormData, 
    errors,
    setErrors, 
    isLoading, 
    error, 
    setError,
    showAuthError,
    setShowAuthError,
    fetchSchema,
    handleApiError
  };
};

export default useFormSchema;
