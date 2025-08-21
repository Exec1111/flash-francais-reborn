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
 * @param {string|number|null} supportId - ID de l'œuvre sélectionnée (support) pour lier les ressources
 * @returns {Object} État et fonctions pour gérer la sauvegarde
 */
export const useSaving = (sessionId, onResourcesGenerated, onClose, supportId) => {
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
    
    console.log('[useSaving] Début handleSaveResources', {
      resources_count: Array.isArray(resources) ? resources.length : 0,
      sessionId,
      supportId,
    });
    setIsSavingResources(true);
    setSaveError(null);
    
    try {
      const createdResources = await saveAllResources(
        resources,
        sessionId,
        null,
        null,
        supportId
      );
      
      const validResources = Array.isArray(createdResources) ? createdResources.filter(Boolean) : [];
      console.log('[useSaving] Ressources créées', {
        created_count: validResources.length,
      });
      // Afficher un message de succès
      alert(`${validResources.length} ressource(s) ont été enregistrées avec succès.`);
      
      // Fermer immédiatement le wizard pour éviter tout blocage UI
      if (onClose) {
        console.log('[useSaving] Appel de onClose(true) pour fermer le wizard');
        onClose(true);
        console.log('[useSaving] onClose(true) appelé');
      }
      
      // Notifier le parent (non bloquant) que des ressources ont été générées (sans valeurs nulles)
      if (onResourcesGenerated) {
        try {
          // Ne pas await pour ne pas bloquer la fermeture du wizard
          Promise.resolve(onResourcesGenerated(validResources)).catch((notifyErr) => {
            console.warn('[useSaving] onResourcesGenerated a levé une erreur (ignorée):', notifyErr);
          });
        } catch (notifyErr) {
          console.warn('[useSaving] onResourcesGenerated a levé une erreur synchronisée (ignorée):', notifyErr);
        }
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde des ressources:", err);
      setSaveError(formatErrorMessage(err, "Erreur lors de la sauvegarde des ressources"));
      console.log('[useSaving] setSaveError appliqué');
    } finally {
      setIsSavingResources(false);
      console.log('[useSaving] Fin handleSaveResources, isSavingResources=false');
    }
  }, [sessionId, onResourcesGenerated, onClose, supportId]);

  return {
    isSavingResources,
    saveError,
    handleSaveResources
  };
};
