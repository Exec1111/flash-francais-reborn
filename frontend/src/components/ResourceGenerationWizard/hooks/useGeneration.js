/**
 * Hook pour la gestion de la génération des ressources
 */
import { useState, useEffect, useCallback } from 'react';
import { generateAllResources } from '../services/generationService';

/**
 * Hook pour gérer la génération des ressources
 * @param {number} activeStep - Étape active du wizard
 * @param {string|number} sessionId - ID de la session
 * @param {Object} configParams - Paramètres de configuration
 * @returns {Object} État et fonctions pour gérer la génération
 */
export const useGeneration = (activeStep, sessionId, configParams) => {
  const [generationStatus, setGenerationStatus] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Initialiser le statut de génération pour les suggestions sélectionnées
   * @param {Array} suggestions - Suggestions sélectionnées
   */
  const initializeGenerationStatus = useCallback((suggestions) => {
    const initialStatus = suggestions.map(s => ({
      suggestion: s,
      status: 'pending',
      data: null,
      error: null
    }));
    
    console.log("[useGeneration] Initialisation du statut de génération:", initialStatus);
    setGenerationStatus(initialStatus);
  }, []);

  /**
   * Déclencher la génération de toutes les ressources
   */
  const triggerGeneration = useCallback(() => {
    if (generationStatus.length === 0 || !generationStatus.some(s => s.status === 'pending')) {
      console.log("[useGeneration] Aucune génération à effectuer");
      return;
    }
    
    console.log("[useGeneration] Déclenchement de la génération");
    setIsGenerating(true);
    
    generateAllResources(
      generationStatus,
      sessionId,
      configParams,
      (updatedStatus) => setGenerationStatus(updatedStatus),
      () => setIsGenerating(false)
    );
  }, [generationStatus, sessionId, configParams]);

  // Déclencher la génération automatiquement lorsque l'étape active est "Génération"
  useEffect(() => {
    if (activeStep === 2 && generationStatus.some(s => s.status === 'pending')) {
      console.log("[useGeneration] Déclenchement automatique de la génération");
      
      // Utiliser setTimeout pour s'assurer que l'état est bien mis à jour
      setTimeout(() => {
        triggerGeneration();
      }, 300);
    }
  }, [activeStep, generationStatus, triggerGeneration]);

  /**
   * Vérifier si toutes les générations sont terminées
   * @returns {boolean} Vrai si toutes les générations sont terminées
   */
  const areAllGenerationsDone = useCallback(() => {
    return generationStatus.every(s => s.status === 'success' || s.status === 'error');
  }, [generationStatus]);

  /**
   * Récupérer les générations réussies
   * @returns {Array} Générations réussies avec données valides
   */
  const getSuccessfulGenerations = useCallback(() => {
    return generationStatus
      .filter(item => {
        const hasSuccessStatus = item.status === 'success';
        let hasData = false;
        
        if (item.data) {
          if (typeof item.data === 'string' && item.data.trim() !== '') {
            hasData = true;
          } else if (typeof item.data === 'object') {
            if (item.data.content && ((typeof item.data.content === 'string' && item.data.content.trim() !== '') || 
                (typeof item.data.content === 'object' && Object.keys(item.data.content).length > 0))) {
              hasData = true;
            } else if (Object.keys(item.data).length > 0 && !item.data.content) {
              hasData = true;
            }
          }
        }
        
        if (hasSuccessStatus && !hasData) {
          console.warn(`[useGeneration] Génération pour ${item.suggestion?.type_key}/${item.suggestion?.subtype_key} marquée comme 'success' mais données manquantes ou vides.`, item.data);
        }
        
        return hasSuccessStatus && hasData;
      })
      .map(item => {
        // S'assurer que les données extraites sont bien celles prévues (le contenu réel)
        let actualData = item.data && item.data.content ? item.data.content : item.data;
        
        return {
          suggestion: item.suggestion,
          data: actualData,
          conserved: true // Par défaut, tous les exercices générés sont conservés
        };
      });
  }, [generationStatus]);

  /**
   * Vérifier si la génération peut passer à l'étape suivante
   * @returns {Object} Résultat de la validation
   */
  const validateGenerationForNextStep = useCallback(() => {
    if (isGenerating || generationStatus.some(s => s.status === 'loading')) {
      return { 
        valid: false, 
        message: "Veuillez attendre la fin de toutes les générations en cours."
      };
    }
    
    const successfulGenerations = getSuccessfulGenerations();
    
    if (successfulGenerations.length === 0) {
      return { 
        valid: false, 
        message: "Aucun exercice n'a été généré avec succès ou les données générées sont vides. Vous ne pouvez pas passer à l'étape d'édition."
      };
    }
    
    return { valid: true, generations: successfulGenerations };
  }, [isGenerating, generationStatus, getSuccessfulGenerations]);

  return {
    generationStatus,
    isGenerating,
    initializeGenerationStatus,
    triggerGeneration,
    areAllGenerationsDone,
    getSuccessfulGenerations,
    validateGenerationForNextStep
  };
};
