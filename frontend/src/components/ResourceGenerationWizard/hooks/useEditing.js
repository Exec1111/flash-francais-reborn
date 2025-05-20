/**
 * Hook pour la gestion de l'édition des ressources
 */
import { useState, useCallback } from 'react';

/**
 * Hook pour gérer l'édition des ressources
 * @returns {Object} État et fonctions pour gérer l'édition
 */
export const useEditing = () => {
  const [resourcesToEdit, setResourcesToEdit] = useState([]);
  const [editedResources, setEditedResources] = useState([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);

  /**
   * Initialiser les ressources à éditer
   * @param {Array} resources - Ressources générées avec succès
   */
  const initializeEditing = useCallback((resources) => {
    setResourcesToEdit(resources);
    
    // Préparer les ressources pour l'édition (avec JSON stringifié)
    setEditedResources(resources.map(res => {
      let jsonString = "";
      try {
        // S'assurer que res.data n'est pas undefined ou null avant stringify
        jsonString = res.data ? JSON.stringify(res.data, null, 2) : "{}";
      } catch (e) {
        console.error(`[useEditing] Erreur de sérialisation JSON pour l'édition : ${res.suggestion?.type_key}/${res.suggestion?.subtype_key}`, e);
        jsonString = "{\n  \"error\": \"Impossible d'afficher les données JSON correctement.\"\n}";
      }
      
      return {
        ...res, // Contient suggestion, data (original), conserved
        editedData: jsonString // Contenu éditable
      };
    }));
    
    setCurrentEditIndex(0);
  }, []);

  /**
   * Gérer le changement d'une ressource éditée
   * @param {number} index - Index de la ressource
   * @param {string} newJsonString - Nouvelle valeur JSON
   */
  const handleResourceEditChange = useCallback((index, newJsonString) => {
    setEditedResources(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        editedData: newJsonString
      };
      return updated;
    });
  }, []);

  /**
   * Basculer la conservation d'une ressource
   * @param {number} index - Index de la ressource
   */
  const handleToggleConserveResource = useCallback((index) => {
    setEditedResources(prev => {
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
  const handleNextEditItem = useCallback(() => {
    if (currentEditIndex < editedResources.length - 1) {
      setCurrentEditIndex(prev => prev + 1);
    }
  }, [currentEditIndex, editedResources.length]);

  /**
   * Passer à la ressource précédente
   */
  const handlePrevEditItem = useCallback(() => {
    if (currentEditIndex > 0) {
      setCurrentEditIndex(prev => prev - 1);
    }
  }, [currentEditIndex]);

  /**
   * Valider l'édition pour passer à l'étape suivante
   * @returns {Object} Résultat de la validation
   */
  const validateEditingForNextStep = useCallback(() => {
    const conservedForMerge = editedResources.filter(r => r.conserved);
    
    if (conservedForMerge.length === 0) {
      return {
        valid: false,
        message: "Aucun exercice n'a été conservé pour la fusion. Vous ne pouvez pas continuer."
      };
    }
    
    // Valider le JSON de toutes les ressources conservées
    for (const resource of conservedForMerge) {
      try {
        JSON.parse(resource.editedData);
      } catch (e) {
        return {
          valid: false,
          message: `Le JSON de l'exercice '${resource.suggestion.type_key} - ${resource.suggestion.subtype_key}' n'est pas valide. Veuillez le corriger à l'étape d'édition.`,
          errorIndex: editedResources.findIndex(r => 
            r.suggestion.type_key === resource.suggestion.type_key && 
            r.suggestion.subtype_key === resource.suggestion.subtype_key
          )
        };
      }
    }
    
    // Préparer les ressources pour la fusion
    const resourcesReadyForMerge = conservedForMerge.map(res => ({
      suggestion: res.suggestion,
      data: JSON.parse(res.editedData),
      model_path: res.suggestion.model_path,
      userId: null,
      mergeStatus: 'pending',
      mergedHtml: null,
      error: null,
      conserved: true
    }));
    
    return { valid: true, resources: resourcesReadyForMerge };
  }, [editedResources]);

  return {
    resourcesToEdit,
    editedResources,
    currentEditIndex,
    initializeEditing,
    handleResourceEditChange,
    handleToggleConserveResource,
    handleNextEditItem,
    handlePrevEditItem,
    validateEditingForNextStep
  };
};
