import { useState } from 'react';

/**
 * Hook personnalisé pour gérer la logique de soumission du formulaire
 * 
 * @param {Object} formData - Données du formulaire à soumettre
 * @param {Function} validateForm - Fonction de validation du formulaire
 * @param {Function} onSuccess - Callback appelé en cas de succès
 * @returns {Object} État et fonctions liés à la soumission du formulaire
 */
const useSubmitLogic = (formData, validateForm, onSuccess) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generationResults, setGenerationResults] = useState([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [editedResults, setEditedResults] = useState([]);
  const [mergedResults, setMergedResults] = useState(null);
  const [progress, setProgress] = useState([]);
  const [generatedTitles, setGeneratedTitles] = useState([]);
  const [resourceId, setResourceId] = useState(null);
  const [htmlPreviewUrl, setHtmlPreviewUrl] = useState(null);
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [localHtmlContent, setLocalHtmlContent] = useState("");

  // L'URL de base de l'API
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

  /**
   * Gère la soumission du formulaire
   */
  const handleSubmit = async () => {
    // Validation du formulaire
    if (!validateForm()) {
      console.log('[DEBUG][handleSubmit] Validation du formulaire échouée. Arrêt de la génération.');
      updateProgress("Validation du formulaire échouée", "error");
      return;
    }
    
    setIsLoading(true);
    setProgress([]);
    updateProgress("Préparation de la génération...", "info");
    
    try {
      // Vérifier que les clés de type sont présentes
      if (!formData.typeKey || !formData.subtypeKey) {
        console.error('[ERROR][handleSubmit] Clés de type manquantes:', { typeKey: formData.typeKey, subtypeKey: formData.subtypeKey });
        updateProgress("Données de formulaire incomplètes", "error");
        throw new Error("Type de ressource non défini");
      }

      // Préparation des données pour l'API
      const payload = {
        type_key: formData.typeKey,
        subtype_key: formData.subtypeKey,
        variables: {}
      };
      
      // Copier toutes les données du formulaire dans les variables, sans inclure typeKey et subtypeKey
      Object.keys(formData).forEach(key => {
        if (key !== 'typeKey' && key !== 'subtypeKey') {
          payload.variables[key] = formData[key];
        }
      });
      
      // Affichage des données envoyées pour débogage
      console.log('[DEBUG][handleSubmit] Données envoyées à l\'API:', payload);
      
      // Appel à l'API
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Aucun jeton d'authentification trouvé");
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate-resource`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur lors de la génération de la ressource");
      }
      
      const result = await response.json();
      console.log('[DEBUG][handleSubmit] Résultat de la génération:', result);
      
      // Mise à jour de l'état avec les résultats
      if (result.content) {
        setGenerationResults([result.content]);
        setEditedResults([result.content]);
        
        // Progression
        updateProgress("Génération réussie", "success");
        
        // Si un callback de succès est fourni, l'appeler
        if (onSuccess) {
          onSuccess(result.content);
        }
      } else {
        throw new Error("Aucun contenu généré");
      }
    } catch (error) {
      console.error('[ERROR][handleSubmit]', error);
      updateProgress(`Erreur: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Met à jour la progression de la génération
   * 
   * @param {string} message - Message de progression
   * @param {string} status - Statut (success, error, info)
   */
  const updateProgress = (message, status = "info") => {
    setProgress(prev => [...prev, { message, status, timestamp: new Date() }]);
  };

  /**
   * Gère la modification d'un résultat
   * 
   * @param {number} index - Index du résultat à modifier
   * @param {Object} newData - Nouvelles données
   */
  const handleEditorChange = (index, newData) => {
    const newResults = [...editedResults];
    newResults[index] = newData;
    setEditedResults(newResults);
  };

  /**
   * Passe au résultat précédent
   */
  const handlePrevResult = () => {
    if (currentEditIndex > 0) {
      setCurrentEditIndex(currentEditIndex - 1);
    }
  };

  /**
   * Passe au résultat suivant
   */
  const handleNextResult = () => {
    if (currentEditIndex < editedResults.length - 1) {
      setCurrentEditIndex(currentEditIndex + 1);
    }
  };

  /**
   * Gère la fusion des résultats en appelant l'API
   */
  const handleMergeAll = async () => {
    setIsLoading(true);
    setMergeSuccess(false);
    updateProgress("Préparation de la fusion...", "info");
    
    try {
      // Vérifier l'authentification
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error("Authentification requise. Veuillez vous connecter.");
      }

      // Vérifier si editedResults est un tableau ou un objet
      let dataToNormalize = editedResults;
      if (Array.isArray(editedResults) && editedResults.length > 0) {
        console.log('[DEBUG][handleMergeAll] editedResults est un tableau, extraction du premier élément');
        dataToNormalize = editedResults[0];
      }
      
      updateProgress("Envoi des données à l'API...", "info");
      
      // Préparation du FormData
      const apiFormData = new FormData();
      
      // Ajouter les informations de base de la ressource
      apiFormData.append('type_key', formData.typeKey);
      apiFormData.append('subtype_key', formData.subtypeKey);
      apiFormData.append('data_json', JSON.stringify(dataToNormalize));
      
      // Log des paramètres pour vérification
      console.log('[DEBUG] Validation des paramètres:');
      console.log(`- type_key: "${formData.typeKey}", vide? ${!formData.typeKey}`);
      console.log(`- subtype_key: "${formData.subtypeKey}", vide? ${!formData.subtypeKey}`);
      console.log(`- data_json présent? ${Boolean(JSON.stringify(dataToNormalize))}`);
      
      // Utilisation de fetch natif
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/merge-resource`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Ne pas définir Content-Type pour laisser le navigateur le faire correctement avec le boundary
        },
        body: apiFormData
      });
      
      // Vérifier la réponse
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[DEBUG] Erreur fetch:', response.status, errorData);
        throw new Error(errorData.detail || "Erreur lors de la fusion");
      }
      
      const responseData = await response.json();
      console.log('[DEBUG] Réponse de l\'API (fetch):', responseData);
      
      // Traiter les résultats de fusion
      handleSuccessfulMerge(responseData);
      
    } catch (error) {
      console.error('[ERROR][handleMergeAll]', error);
      updateProgress(`Erreur lors de la fusion: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Traite les résultats de fusion réussis
   */
  const handleSuccessfulMerge = (data) => {
    // Extraire les informations importantes du formulaire d'édition
    const title = editedResults[0]?.titre || editedResults[0]?.title || "";
    const description = editedResults[0]?.description || "";
    
    console.log('[DEBUG] Données extraites du formulaire d\'\u00e9dition:');
    console.log('- title/titre:', title);
    console.log('- description:', description);
    
    // Stocker les résultats fusionnés avec les données complètes
    const mergedResult = {
      ...editedResults[0],  // Données du formulaire d'édition
      ...data,              // Données de l'API (comme html_url)
      titre: title,         // S'assurer que le titre est bien conservé
      title: title,         // Doublon pour compatibilité
      description: description
    };
    
    setMergedResults(mergedResult);
    
    // Définir l'URL de prévisualisation HTML
    if (data && data.html_url) {
      setHtmlPreviewUrl(data.html_url);
      setLocalHtmlContent(data.html_content || "");
      setMergeSuccess(true);
      updateProgress("Fusion réussie", "success");
    }
  };

  /**
   * Finalise la ressource en créant l'enregistrement définitif dans la base de données
   */
  const handleFinish = async () => {
    setIsLoading(true);
    updateProgress("Préparation de la création de ressource...", "info");
    
    try {
      // Vérifier l'authentification
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error("Authentification requise. Veuillez vous connecter.");
      }

      // Vérifier que nous avons bien les résultats de fusion et l'URL de prévisualisation
      if (!mergedResults || !mergedResults.html_url) {
        throw new Error("Aucune ressource fusionnée disponible. Veuillez d'abord effectuer la fusion.");
      }

      updateProgress("Préparation des données...", "info");
      
      // Extraire les informations importantes 
      const title = mergedResults.titre || mergedResults.title || "";
      const description = mergedResults.description || "";
      
      console.log('[DEBUG][handleFinish] Données extraites des résultats fusionnés:');
      console.log('- title/titre:', title);
      console.log('- description:', description);
      console.log('- html_url:', mergedResults.html_url);
      
      // Préparation du FormData pour l'API
      const apiFormData = new FormData();
      
      // Ajouter les informations de base de la ressource
      apiFormData.append('title', title);
      apiFormData.append('description', description);
      apiFormData.append('type_id', formData.typeId || "1"); // 1 = exercice par défaut
      apiFormData.append('sub_type_id', formData.subtypeId || "1"); // 1 = qcm par défaut
      apiFormData.append('source_type', 'ai');
      apiFormData.append('html_path', mergedResults.html_url);
      
      // Ajouter les IDs d'associations (vides si non fournis)
      apiFormData.append('study_object_ids_json', JSON.stringify(mergedResults.study_object_ids || []));
      apiFormData.append('session_ids_json', JSON.stringify(mergedResults.session_ids || []));
      apiFormData.append('objective_ids_json', JSON.stringify(mergedResults.objective_ids || []));
      
      // Log des données envoyées
      console.log('[DEBUG][handleFinish] Données envoyées pour création de ressource:');
      for (let pair of apiFormData.entries()) {
        console.log(`- ${pair[0]}: ${pair[1].toString().substring(0, 50)}${pair[1].toString().length > 50 ? '...' : ''}`);
      }
      
      updateProgress("Envoi des données à l'API...", "info");
      
      // Appel à l'API pour créer la ressource finale
      const response = await fetch(`${API_BASE_URL}/api/v1/resources/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Ne pas définir Content-Type pour laisser le navigateur le faire correctement
        },
        body: apiFormData
      });
      
      // Vérifier la réponse
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[DEBUG][handleFinish] Erreur API:', response.status, errorData);
        throw new Error(errorData.detail || "Erreur lors de la création de la ressource");
      }
      
      const data = await response.json();
      console.log('[DEBUG][handleFinish] Ressource créée avec succès:', data);
      
      updateProgress("Ressource finalisée avec succès", "success");
      
      // Si un callback de succès est fourni, l'appeler avec l'ID de la ressource créée
      if (onSuccess && typeof onSuccess === 'function') {
        console.log('[DEBUG][handleFinish] Appel de onSuccess avec ID:', data.id);
        onSuccess(data.id);
      }
      
    } catch (error) {
      console.error('[ERROR][handleFinish]', error);
      updateProgress(`Erreur lors de la finalisation: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    generationResults,
    currentEditIndex,
    setCurrentEditIndex,
    editedResults,
    setEditedResults,
    mergedResults,
    setMergedResults,
    progress,
    generatedTitles,
    resourceId,
    setResourceId,
    htmlPreviewUrl,
    setHtmlPreviewUrl,
    mergeSuccess,
    setMergeSuccess,
    localHtmlContent,
    setLocalHtmlContent,
    handleSubmit,
    handleEditorChange,
    handlePrevResult,
    handleNextResult,
    handleMergeAll,
    handleFinish,
    updateProgress
  };
};

export default useSubmitLogic;
