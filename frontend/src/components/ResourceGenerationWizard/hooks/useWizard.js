/**
 * Hook principal pour la gestion du wizard de génération de ressources
 */
import { useState, useCallback } from 'react';
import { useSuggestions } from './useSuggestions';
import { useGeneration } from './useGeneration';
import { useEditing } from './useEditing';
import { useMerging } from './useMerging';
import { useSaving } from './useSaving';

/**
 * Hook pour gérer l'ensemble du wizard de génération de ressources
 * @param {string|number} sessionId - ID de la session
 * @param {Function} onResourcesGenerated - Callback appelé lorsque des ressources sont générées
 * @param {Function} onClose - Callback appelé pour fermer le wizard
 * @returns {Object} État et fonctions pour gérer le wizard
 */
export const useWizard = (sessionId, onResourcesGenerated, onClose) => {
  const steps = ['Configuration', 'Suggestions', 'Génération', 'Édition', 'Fusion HTML'];
  const [activeStep, setActiveStep] = useState(0);
  const [configParams, setConfigParams] = useState({
    niveau_classe: '',
    nombre_ressources: ''
  });

  // Hooks spécifiques à chaque étape
  const suggestions = useSuggestions(sessionId, activeStep, configParams);
  const generation = useGeneration(activeStep, sessionId, configParams);
  const editing = useEditing();
  const merging = useMerging(activeStep);
  const saving = useSaving(sessionId, onResourcesGenerated, onClose);

  /**
   * Gérer la soumission de la configuration initiale
   * @param {Object} config - Configuration initiale
   */
  const handleConfigSubmit = useCallback((config) => {
    setConfigParams(config);
    setActiveStep(1); // Passer à l'étape des suggestions
  }, []);

  /**
   * Passer à l'étape précédente
   */
  const handlePrevStep = useCallback(() => {
    if (activeStep === 1) {
      // Optionnel: demander confirmation si on veut quitter la génération en cours
      suggestions.setSuggestions([]);
      generation.setGenerationStatus([]);
    }
    setActiveStep(prev => prev - 1);
  }, [activeStep, suggestions, generation]);

  /**
   * Passer à l'étape suivante
   */
  const handleNextStep = useCallback(() => {
    console.log("[handleNextStep] Current activeStep: " + activeStep);

    if (activeStep === 0) { // Configuration -> Suggestions
      // Déjà géré par handleConfigSubmit
      setActiveStep(1);
    } else if (activeStep === 1) { // Suggestions -> Génération
      const validationResult = suggestions.validateSelectedSuggestions();
      
      if (!validationResult.valid) {
        alert(validationResult.message);
        return;
      }
      
      // Initialiser le statut de génération pour les suggestions sélectionnées
      generation.initializeGenerationStatus(validationResult.suggestions);
      setActiveStep(2);
      
      // La génération sera déclenchée automatiquement par le hook useGeneration
    } else if (activeStep === 2) { // Génération -> Édition
      const validationResult = generation.validateGenerationForNextStep();
      
      if (!validationResult.valid) {
        alert(validationResult.message);
        return;
      }
      
      // Initialiser l'édition avec les ressources générées avec succès
      editing.initializeEditing(validationResult.generations);
      setActiveStep(3);
    } else if (activeStep === 3) { // Édition -> Fusion HTML
      const validationResult = editing.validateEditingForNextStep();
      
      if (!validationResult.valid) {
        alert(validationResult.message);
        
        // Si une erreur de JSON est détectée, positionner l'éditeur sur la ressource en erreur
        if (validationResult.errorIndex !== undefined) {
          editing.setCurrentEditIndex(validationResult.errorIndex);
        }
        
        return;
      }
      
      // Initialiser la fusion avec les ressources éditées
      merging.initializeMerging(validationResult.resources);
      setActiveStep(4);
      
      // La fusion sera déclenchée automatiquement par le hook useMerging
    } else if (activeStep === 4) { // Fusion HTML -> Sauvegarde
      const validationResult = merging.validateMergingForNextStep();
      
      if (!validationResult.valid) {
        alert(validationResult.message);
        return;
      }
      
      // Sauvegarder les ressources
      saving.handleSaveResources(validationResult.resources);
    }
  }, [
    activeStep, 
    suggestions, 
    generation, 
    editing, 
    merging, 
    saving
  ]);

  return {
    steps,
    activeStep,
    configParams,
    handleConfigSubmit,
    handlePrevStep,
    handleNextStep,
    suggestions,
    generation,
    editing,
    merging,
    saving
  };
};
