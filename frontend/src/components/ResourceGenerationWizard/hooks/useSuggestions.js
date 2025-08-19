/**
 * Hook pour la gestion des suggestions d'exercices
 */
import { useState, useEffect } from 'react';
import { aiService } from '../../../services/aiService';
import { formatErrorMessage } from '../utils/formatters';

/**
 * Hook pour gérer les suggestions d'exercices
 * @param {string|number} sessionId - ID de la session
 * @param {number} activeStep - Étape active du wizard
 * @param {Object} configParams - Paramètres de configuration
 * @returns {Object} État et fonctions pour gérer les suggestions
 */
export const useSuggestions = (sessionId, activeStep, configParams) => {
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionsIndices, setSelectedSuggestionsIndices] = useState({});
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);
  const [isSuggestionRequestPending, setIsSuggestionRequestPending] = useState(false);

  // Récupérer les suggestions lorsque l'étape active est "Suggestions"
  useEffect(() => {
    if (activeStep === 1 && sessionId) {
      const fetchSuggestions = async () => {
        if (isSuggestionRequestPending) {
          console.log("[FRONT] Une requête de suggestions est déjà en cours, requête ignorée");
          return;
        }
        setIsLoadingSuggestions(true);
        setIsSuggestionRequestPending(true);
        setSuggestionsError(null);
        try {
          // Logs de débogage plus détaillés
          console.log("%c[useSuggestions] Débogage configuration", "background: #9c27b0; color: white; padding: 2px 5px; font-weight: bold;");
          console.log("Paramètres de configuration reçus par le hook:", configParams);
          
          // Vérifier spécifiquement type_resources
          if (configParams.type_resources) {
            console.log("%cAnalyse de type_resources:", "color: #9c27b0; font-weight: bold;", {
              estTableau: Array.isArray(configParams.type_resources),
              longueur: configParams.type_resources.length,
              contenu: JSON.stringify(configParams.type_resources),
              premierElement: configParams.type_resources.length > 0 ? configParams.type_resources[0] : null
            });
          } else {
            console.log("%ctype_resources", "color: #9c27b0;", "non défini ou vide");
          }
          
          // Préparer les paramètres pour l'API
          const apiParams = {
            niveau_classe: configParams.niveau_classe || undefined,
            nombre_ressources: configParams.nombre_ressources ? parseInt(configParams.nombre_ressources) : undefined,
            support_id: configParams.support_id || undefined,
            type_resources: configParams.type_resources && configParams.type_resources.length > 0 ? configParams.type_resources : undefined
          };
          
          console.log("%cParamètres préparés pour l'API:", "background: #ff9800; color: white; font-weight: bold;", apiParams);
          
          // Faire l'appel API
          const response = await aiService.getSuggestions(sessionId, apiParams);
          setSuggestions(response.suggestions || []);
          setSelectedSuggestionsIndices({});
        } catch (err) {
          console.error("Erreur lors de la récupération des suggestions:", err);
          setSuggestionsError(formatErrorMessage(err, "Erreur lors de la récupération des suggestions"));
        } finally {
          setIsLoadingSuggestions(false);
          setIsSuggestionRequestPending(false);
        }
      };
      fetchSuggestions();
    }
  }, [activeStep, sessionId, configParams.niveau_classe, configParams.nombre_ressources, configParams.support_id, configParams.type_resources, isSuggestionRequestPending]);

  /**
   * Sélectionner/désélectionner une suggestion
   * @param {number} index - Index de la suggestion
   */
  const handleToggleSuggestion = (index) => {
    setSelectedSuggestionsIndices(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  /**
   * Récupérer les suggestions sélectionnées
   * @returns {Array} Suggestions sélectionnées
   */
  const getSelectedSuggestions = () => {
    return suggestions.filter((_, index) => selectedSuggestionsIndices[index]);
  };

  /**
   * Valider les suggestions sélectionnées
   * @returns {Array} Suggestions valides
   */
  const validateSelectedSuggestions = () => {
    const selected = getSelectedSuggestions();
    
    if (selected.length === 0) {
      return { valid: false, message: "Veuillez sélectionner au moins une suggestion d'exercice." };
    }
    
    // S'assurer que chaque suggestion a les propriétés nécessaires
    const validSuggestions = selected.filter(s => {
      const isValid = s && s.type_key && s.subtype_key;
      if (!isValid) {
        console.error("[validateSelectedSuggestions] Suggestion invalide détectée:", s);
      }
      return isValid;
    });
    
    if (validSuggestions.length === 0) {
      return { 
        valid: false, 
        message: "Aucune suggestion valide n'a été sélectionnée. Impossible de continuer.",
        error: "Aucune suggestion valide parmi les sélectionnées"
      };
    }

    // Règle métier: 'analyse_texte' requiert un support pédagogique
    const hasAnalyseTexte = validSuggestions.some(s => s.type_key === 'exercice' && s.subtype_key === 'analyse_texte');
    if (hasAnalyseTexte && !configParams?.support_id) {
      return {
        valid: false,
        message: "L'exercice 'Analyse de texte' requiert un support pédagogique (œuvre). Veuillez sélectionner un support dans la configuration."
      };
    }
    
    return { valid: true, suggestions: validSuggestions };
  };

  return {
    suggestions,
    selectedSuggestionsIndices,
    isLoadingSuggestions,
    suggestionsError,
    handleToggleSuggestion,
    getSelectedSuggestions,
    validateSelectedSuggestions
  };
};
