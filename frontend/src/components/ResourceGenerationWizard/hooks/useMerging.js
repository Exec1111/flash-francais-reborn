/**
 * Hook pour la gestion de la fusion des ressources avec leurs templates HTML
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { mergeAllResources } from '../services/mergeService';

/**
 * Vérifie si un type de ressource est JSON-first (pas besoin de fusion HTML réelle)
 * @param {string} subtypeKey - Clé du sous-type de ressource
 * @returns {boolean} Vrai si c'est un type JSON-first
 */
const isJsonFirstResource = (subtypeKey) => {
  const subtypeKeyNorm = (subtypeKey || '').toLowerCase();
  return ['champlex2', 'champlex', 'qcm', 'pendu', 'quisuisje', 'textereconstitue'].includes(subtypeKeyNorm);
};

/**
 * Hook pour gérer la fusion des ressources
 * @param {number} activeStep - Étape active du wizard
 * @returns {Object} État et fonctions pour gérer la fusion
 */
export const useMerging = (activeStep) => {
  const [resourcesToMerge, setResourcesToMerge] = useState([]);
  const [finalMergedResources, setFinalMergedResources] = useState([]);
  const [currentMergeIndex, setCurrentMergeIndex] = useState(0);
  const [mergedHtmlPreview, setMergedHtmlPreview] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [htmlMergeError, setHtmlMergeError] = useState(null);
  
  // Utiliser des références pour éviter les fusions multiples
  const mergingInProgressRef = useRef(false);
  const mergingTriggeredRef = useRef(false);

  // Logs d'observation des états de fusion
  useEffect(() => {
    try {
      const counts = finalMergedResources.reduce((acc, r) => {
        const key = r.mergeStatus || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      console.log('[useMerging] Changement finalMergedResources', {
        total: finalMergedResources.length,
        counts,
        isMerging,
      });
    } catch (e) {
      console.warn('[useMerging] Impossible de logger finalMergedResources', e);
    }
  }, [finalMergedResources, isMerging]);

  /**
   * Initialiser les ressources à fusionner
   * @param {Array} resources - Ressources éditées prêtes pour la fusion
   */
  const initializeMerging = useCallback((resources) => {
    console.log('[useMerging] initializeMerging', { count: Array.isArray(resources) ? resources.length : 0 });
    setResourcesToMerge(resources);
    setFinalMergedResources(resources);
    setCurrentMergeIndex(0);
    setMergedHtmlPreview('');
    setHtmlMergeError(null);
  }, []);

  /**
   * Déclencher la fusion de toutes les ressources
   */
  const triggerMerging = useCallback(() => {
    // Vérifier si une fusion est déjà en cours pour éviter les appels multiples
    if (mergingInProgressRef.current) {
      console.log("[useMerging] Fusion déjà en cours, ignorer l'appel");
      return;
    }

    if (finalMergedResources.length === 0 || !finalMergedResources.some(r => r.mergeStatus === 'pending')) {
      console.log("[useMerging] Aucune fusion à effectuer");
      return;
    }

    console.log("[useMerging] Déclenchement de la fusion");
    setIsMerging(true);
    setHtmlMergeError(null);
    mergingInProgressRef.current = true;

    // Vérifier si toutes les ressources sont JSON-first
    const hasNonJsonFirstResources = finalMergedResources.some(r =>
      r.mergeStatus === 'pending' && !isJsonFirstResource(r.suggestion?.subtype_key)
    );

    if (!hasNonJsonFirstResources) {
      console.log("[useMerging] Toutes les ressources sont JSON-first, contournement de la fusion");

      // Simuler une réponse de merge pour les types JSON-first
      const updatedResources = finalMergedResources.map(resource => {
        if (resource.mergeStatus === 'pending') {
          const subtypeKeyNorm = (resource.suggestion?.subtype_key || '').toLowerCase();
          let placeholderUrl;

          switch(subtypeKeyNorm) {
            case 'champlex2':
              placeholderUrl = '/api/v1/ai/champlex2-json-placeholder';
              break;
            case 'champlex':
              placeholderUrl = '/api/v1/ai/champlex-json-placeholder';
              break;
            case 'qcm':
              placeholderUrl = '/api/v1/ai/qcm-json-placeholder';
              break;
            case 'pendu':
              placeholderUrl = '/api/v1/ai/pendu-json-placeholder';
              break;
            case 'quisuisje':
              placeholderUrl = '/api/v1/ai/quisuisje-json-placeholder';
              break;
            case 'textereconstitue':
              placeholderUrl = '/api/v1/ai/textereconstitue-json-placeholder';
              break;
            default:
              placeholderUrl = '/api/v1/ai/json-placeholder';
          }

          return {
            ...resource,
            mergeStatus: 'success',
            mergedHtml: placeholderUrl,
            html_url: placeholderUrl,
            html_path: placeholderUrl,
            data_json: resource.data
          };
        }
        return resource;
      });

      setFinalMergedResources(updatedResources);
      setIsMerging(false);
      setHtmlMergeError(null);
      mergingInProgressRef.current = false;
      console.log('[useMerging] Fusion JSON-first terminée');
      return;
    }

    // Fusion normale pour les ressources non-JSON-first
    mergeAllResources(
      finalMergedResources,
      (updatedResources) => {
        try {
          const counts = updatedResources.reduce((acc, r) => {
            const key = r.mergeStatus || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          console.log('[useMerging] Statut de fusion mis à jour', { total: updatedResources.length, counts });
        } catch (e) {
          console.warn('[useMerging] Impossible de logger updatedResources', e);
        }
        setFinalMergedResources(updatedResources);
      },
      (previewHtml) => {
        console.log('[useMerging] Mise à jour de la prévisualisation HTML (taille)', previewHtml ? previewHtml.length : 0);
        setMergedHtmlPreview(previewHtml);
      },
      () => {
        setIsMerging(false);
        setHtmlMergeError(null);
        mergingInProgressRef.current = false;
        console.log('[useMerging] Fusion terminée');
      }
    ).catch(err => {
      console.error("[useMerging] Erreur lors de la fusion:", err);
      setHtmlMergeError(err.message || "Erreur lors de la fusion");
      setIsMerging(false);
      mergingInProgressRef.current = false;
    });
  }, [finalMergedResources]);

  // Déclencher la fusion automatiquement lorsque l'étape active est "Fusion HTML"
  useEffect(() => {
    // Vérifier si cette étape a déjà déclenché une fusion pour éviter les appels multiples
    if (activeStep === 4 && !mergingTriggeredRef.current && 
        finalMergedResources.length > 0 && 
        finalMergedResources.some(r => r.mergeStatus === 'pending') && 
        !mergingInProgressRef.current) {
      
      console.log("[useMerging] Déclenchement automatique de la fusion");
      mergingTriggeredRef.current = true;
      
      // Utiliser setTimeout pour s'assurer que l'état est bien mis à jour et éviter les appels multiples
      setTimeout(() => {
        if (!mergingInProgressRef.current) {
          triggerMerging();
        }
      }, 300);
    } else if (activeStep !== 4) {
      // Réinitialiser le drapeau lorsqu'on quitte l'étape de fusion
      mergingTriggeredRef.current = false;
    }
  }, [activeStep, finalMergedResources, triggerMerging]);

  /**
   * Basculer la conservation d'une ressource fusionnée
   * @param {number} index - Index de la ressource
   */
  const handleToggleResourceConservation = useCallback((index) => {
    setFinalMergedResources(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        conserved: !updated[index].conserved
      };
      return updated;
    });
  }, []);

  /**
   * Passer à la ressource suivante
   */
  const handleNextMergeItem = useCallback(() => {
    if (currentMergeIndex < finalMergedResources.length - 1) {
      setCurrentMergeIndex(prev => prev + 1);
      
      // Mettre à jour la prévisualisation
      const nextResource = finalMergedResources[currentMergeIndex + 1];
      if (nextResource && nextResource.mergeStatus === 'success' && nextResource.mergedHtml) {
        setMergedHtmlPreview(nextResource.mergedHtml);
      } else {
        setMergedHtmlPreview('');
      }
    }
  }, [currentMergeIndex, finalMergedResources]);

  /**
   * Passer à la ressource précédente
   */
  const handlePrevMergeItem = useCallback(() => {
    if (currentMergeIndex > 0) {
      setCurrentMergeIndex(prev => prev - 1);
      
      // Mettre à jour la prévisualisation
      const prevResource = finalMergedResources[currentMergeIndex - 1];
      if (prevResource && prevResource.mergeStatus === 'success' && prevResource.mergedHtml) {
        setMergedHtmlPreview(prevResource.mergedHtml);
      } else {
        setMergedHtmlPreview('');
      }
    }
  }, [currentMergeIndex, finalMergedResources]);

  /**
   * Vérifier si toutes les fusions ont été tentées
   * @returns {boolean} Vrai si toutes les fusions ont été tentées
   */
  const areAllMergesAttempted = useCallback(() => {
    return finalMergedResources.every(r => r.mergeStatus === 'success' || r.mergeStatus === 'error');
  }, [finalMergedResources]);

  /**
   * Récupérer les ressources prêtes pour la sauvegarde
   * @returns {Array} Ressources prêtes pour la sauvegarde
   */
  const getResourcesReadyForSave = useCallback(() => {
    return finalMergedResources.filter(r => 
      r.mergeStatus === 'success' && 
      r.mergedHtml && 
      r.conserved !== false
    );
  }, [finalMergedResources]);

  /**
   * Valider la fusion pour passer à l'étape suivante
   * @returns {Object} Résultat de la validation
   */
  const validateMergingForNextStep = useCallback(() => {
    if (isMerging) {
      console.log('[useMerging] Validation next step refusée: fusion en cours');
      return {
        valid: false,
        message: "Veuillez attendre la fin de toutes les fusions HTML."
      };
    }
    
    if (!areAllMergesAttempted()) {
      const counts = finalMergedResources.reduce((acc, r) => {
        const key = r.mergeStatus || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      console.log('[useMerging] Validation next step refusée: fusions incomplètes', { counts });
      return {
        valid: false,
        message: "Certaines fusions n'ont pas encore été tentées ou sont en erreur. Veuillez vérifier."
      };
    }
    
    const resourcesForSave = getResourcesReadyForSave();
    
    if (resourcesForSave.length === 0) {
      console.log('[useMerging] Validation next step refusée: aucune ressource prête à sauvegarder');
      return {
        valid: false,
        message: "Aucune ressource n'est prête pour la sauvegarde. Veuillez vérifier que des ressources ont été fusionnées avec succès et conservées."
      };
    }
    
    console.log('[useMerging] Validation next step OK', { count: resourcesForSave.length });
    return {
      valid: true,
      resources: resourcesForSave
    };
  }, [isMerging, areAllMergesAttempted, getResourcesReadyForSave]);

  return {
    resourcesToMerge,
    finalMergedResources,
    currentMergeIndex,
    mergedHtmlPreview,
    isMerging,
    htmlMergeError,
    initializeMerging,
    triggerMerging,
    handleToggleResourceConservation,
    handleNextMergeItem,
    handlePrevMergeItem,
    areAllMergesAttempted,
    getResourcesReadyForSave,
    validateMergingForNextStep
  };
};
