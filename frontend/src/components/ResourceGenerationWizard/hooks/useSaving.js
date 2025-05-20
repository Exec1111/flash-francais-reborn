/**
 * Hook pour la gestion de la sauvegarde des ressources
 */
import { useState, useCallback } from 'react';
import { saveAllResources } from '../services/saveService';
import { formatErrorMessage } from '../utils/formatters';

/**
 * Hook pour gérer la sauvegarde des ressources
 * @param {string|number} sessionId - ID de la session
 * @param {Function} onResourcesGenerated - Callback appelé lorsque des ressources sont générées
 * @param {Function} onClose - Callback appelé pour fermer le wizard
 * @returns {Object} État et fonctions pour gérer la sauvegarde
 */
export const useSaving = (sessionId, onResourcesGenerated, onClose) => {
  const [isSavingResources, setIsSavingResources] = useState(false);
  const [saveError, setSaveError] = useState(null);

  /**
   * Sauvegarder les ressources
   * @param {Array} resources - Ressources à sauvegarder
   */
  const handleSaveResources = useCallback(async (resources) => {
    if (resources.length === 0) {
      alert("Aucune ressource n'est prête pour la sauvegarde.");
      return;
    }
    
    setIsSavingResources(true);
    setSaveError(null);
    
    try {
      const createdResources = await saveAllResources(
        resources,
        sessionId,
        null,
        null
      );
      
      // Notifier le parent que des ressources ont été générées
      if (onResourcesGenerated) {
        onResourcesGenerated(createdResources);
      }
      
      // Afficher un message de succès et fermer le wizard
      alert(`${createdResources.length} ressource(s) ont été enregistrées avec succès.`);
      
      // Appeler onClose avec true pour indiquer qu'un rafraîchissement est nécessaire
      if (onClose) {
        onClose(true);
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde des ressources:", err);
      setSaveError(formatErrorMessage(err, "Erreur lors de la sauvegarde des ressources"));
    } finally {
      setIsSavingResources(false);
    }
  }, [sessionId, onResourcesGenerated, onClose]);

  return {
    isSavingResources,
    saveError,
    handleSaveResources
  };
};
