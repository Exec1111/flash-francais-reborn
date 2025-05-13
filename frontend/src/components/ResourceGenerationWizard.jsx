import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  useMediaQuery
} from '@mui/material';
import api from '../services/api';
import { aiService } from '../services/aiService';

// Composants d'étapes
import SuggestionStep from './wizard/SuggestionStep';
import GenerationStep from './wizard/GenerationStep';
import EditStep from './wizard/EditStep';
import MergeStep from './wizard/MergeStep';
import SaveStep from './wizard/SaveStep';

// Utilitaires
import { formatErrorMessage } from './wizard/utils';

/**
 * Composant principal du wizard de génération de ressources pédagogiques
 */
const ResourceGenerationWizard = ({ sessionId, onClose, onResourcesGenerated }) => {
  const steps = ['Suggestions', 'Génération', 'Édition', 'Fusion HTML'];
  const [activeStep, setActiveStep] = React.useState(0);

  // États pour l'Étape 0: Suggestions
  const [suggestions, setSuggestions] = React.useState([]);
  const [selectedSuggestionsIndices, setSelectedSuggestionsIndices] = React.useState({}); 
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const [suggestionsError, setSuggestionsError] = React.useState(null);
  const [isSuggestionRequestPending, setIsSuggestionRequestPending] = React.useState(false); // Protection contre doubles appels

  // États pour l'Étape 1: Génération
  const [suggestionsToGenerate, setSuggestionsToGenerate] = React.useState([]);
  const [generationStatus, setGenerationStatus] = React.useState([]); 
  const [isGenerating, setIsGenerating] = React.useState(false);

  // États pour l'Étape 2: Édition
  const [resourcesToEdit, setResourcesToEdit] = React.useState([]); 
  const [currentEditIndex, setCurrentEditIndex] = React.useState(0);
  const [editedResources, setEditedResources] = React.useState([]); 

  // États pour l'Étape 3: Fusion HTML
  const [resourcesToMerge, setResourcesToMerge] = React.useState([]); 
  const [currentMergeIndex, setCurrentMergeIndex] = React.useState(0);
  const [mergedHtmlPreview, setMergedHtmlPreview] = React.useState(''); 
  const [isMerging, setIsMerging] = React.useState(false);
  const [htmlMergeError, setHtmlMergeError] = React.useState(null);
  const [finalMergedResources, setFinalMergedResources] = React.useState([]);

  // États pour la sauvegarde finale
  const [isSavingResources, setIsSavingResources] = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Étape 0: Récupérer les suggestions
  React.useEffect(() => {
    if (activeStep === 0 && sessionId) {
      const fetchSuggestions = async () => {
        // Protection contre les doubles appels - si une requête est déjà en cours, on ne fait rien
        if (isSuggestionRequestPending) {
          console.log("[FRONT] Une requête de suggestions est déjà en cours, requête ignorée");
          return;
        }
        
        setIsLoadingSuggestions(true);
        setIsSuggestionRequestPending(true); // Activer le verrouillage
        setSuggestionsError(null);
        
        try {
          // Utiliser le service avec cache au lieu de l'appel API direct
          const response = await aiService.getSuggestions(sessionId);
          setSuggestions(response.suggestions || []);
          setSelectedSuggestionsIndices({});
        } catch (err) {
          console.error("Erreur lors de la récupération des suggestions:", err);
          setSuggestionsError(formatErrorMessage(err, "Erreur lors de la récupération des suggestions"));
        } finally {
          setIsLoadingSuggestions(false);
          setIsSuggestionRequestPending(false); // Toujours désactiver le verrouillage, même en cas d'erreur
        }
      };
      fetchSuggestions();
    }
  }, [activeStep, sessionId]);

  const handleToggleSuggestion = (index) => {
    setSelectedSuggestionsIndices(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Étape 1: Générer les ressources sélectionnées
  React.useEffect(() => {
    if (activeStep === 1 && suggestionsToGenerate.length > 0 && generationStatus.every(s => s.status === 'pending')) {
      const generateAllResources = async () => {
        setIsGenerating(true);
        const newGenerationStatus = [...generationStatus];

        for (let i = 0; i < suggestionsToGenerate.length; i++) {
          const suggestion = suggestionsToGenerate[i];
          newGenerationStatus[i] = { ...newGenerationStatus[i], status: 'loading' };
          setGenerationStatus([...newGenerationStatus]);

          try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error("Token d'authentification manquant");

            // Préparation des variables pour le prompt IA
            const variables = {
              session_id: sessionId,
              // Vérifier que sequence_id est défini avant de l'inclure
              ...(suggestion.sequence_id && { sequence_id: suggestion.sequence_id }),
              // Inclure le titre de la suggestion s'il existe
              ...(suggestion.title && { suggestion_title: suggestion.title }),
              // Ajouter d'autres paramètres si nécessaire
              num_variations: 1
            };

            // Structure conforme au schéma AIResourceGenerationRequest attendu par le backend
            const requestBody = {
              type_key: suggestion.type_key,
              subtype_key: suggestion.subtype_key,
              variables: variables // Le backend attend ce champ spécifiquement
            };

            console.log(`Génération de la ressource ${suggestion.type_key}/${suggestion.subtype_key} avec body:`, requestBody);

            const response = await api.post(
              `/ai/generate-resource`, 
              requestBody, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            console.log(`Réponse pour ${suggestion.type_key}/${suggestion.subtype_key}:`, response.data);
            newGenerationStatus[i] = { 
              ...newGenerationStatus[i], 
              status: 'success', 
              data: response.data 
            };
          } catch (err) {
            console.error(`Erreur lors de la génération de ${suggestion.type_key}/${suggestion.subtype_key}:`, err);
            newGenerationStatus[i] = { 
              ...newGenerationStatus[i], 
              status: 'error', 
              error: formatErrorMessage(err, "Erreur lors de la génération")
            };
          }
          setGenerationStatus([...newGenerationStatus]);
        }
        setIsGenerating(false);
      };
      generateAllResources();
    }
  }, [activeStep, suggestionsToGenerate, generationStatus, sessionId]);

  const handleNextStep = () => {
    if (activeStep === 0) { // Passage de Suggestions à Génération
      const selected = suggestions.filter((_, index) => selectedSuggestionsIndices[index]);
      if (selected.length === 0) {
        alert("Veuillez sélectionner au moins une suggestion pour continuer.");
        return;
      }
      setSuggestionsToGenerate(selected);
      setGenerationStatus(selected.map(sugg => ({ suggestion: sugg, status: 'pending' })));
    } else if (activeStep === 1) { // Passage de Génération (1) à Édition (2)
      const successfulGenerations = generationStatus
        .filter(item => item.status === 'success' && item.data)
        .map(item => ({ 
          suggestion: item.suggestion, 
          data: item.data, // Le JSON brut tel que retourné par generate-resource
        }));
      
      if (successfulGenerations.length === 0 && generationStatus.every(s => s.status !== 'loading')) { // Vérifier aussi que tout est terminé
        alert("Aucun exercice n'a été généré avec succès. Vous ne pouvez pas passer à l'étape d'édition.");
        return; 
      }
      if (generationStatus.some(s => s.status === 'loading')) {
        alert("Veuillez attendre la fin de toutes les générations.");
        return;
      }
      setResourcesToEdit(successfulGenerations);
      setEditedResources(successfulGenerations.map(res => {
        // Vérifier que les données existent et sont correctement structurées
        let generatedContent;
        
        // Extraire le contenu généré selon sa structure
        if (res.data && typeof res.data === 'object') {
          if (res.data.generated_content) {
            // Cas 1: Structure attendue avec generated_content
            generatedContent = res.data.generated_content;
          } else if (Object.keys(res.data).length > 0) {
            // Cas 2: Les données sont directement dans res.data
            generatedContent = res.data;
          } else {
            // Cas 3: Aucune donnée valide
            generatedContent = {};
          }
        } else {
          // Cas 4: res.data n'est pas un objet
          generatedContent = {};
        }
        
        // Convertir en chaîne JSON pour le stockage
        const jsonString = JSON.stringify(generatedContent, null, 2);
        console.log(`Données pour édition (${res.suggestion.type_key}/${res.suggestion.subtype_key}):`, jsonString);
        
        return {
          ...res,
          conserved: true, // Par défaut, on conserve l'exercice
          editedData: jsonString
        };
      }));
      setCurrentEditIndex(0); // Commencer l'édition par le premier exercice
    } else if (activeStep === 2) {
      const conservedForMerge = editedResources.filter(r => r.conserved);
      if (conservedForMerge.length === 0) {
        alert("Aucun exercice n'a été conservé pour la fusion. Vous ne pouvez pas continuer.");
        return;
      }
      // Valider le JSON de toutes les ressources conservées avant de passer à la suite
      for (const resource of conservedForMerge) {
        try {
          JSON.parse(resource.editedData); // Tente de parser pour valider
        } catch (e) {
          alert(`Le JSON de l'exercice '${resource.suggestion.type_key} - ${resource.suggestion.subtype_key}' n'est pas valide. Veuillez le corriger à l'étape d'édition.`);
          return;
        }
      }
      setResourcesToMerge(conservedForMerge.map(r => ({...r, editedDataJson: JSON.parse(r.editedData) }))); // Stocker le JSON parsé
      setFinalMergedResources(conservedForMerge.map(r => ({ // Initialiser pour stockage final
        suggestion: r.suggestion,
        editedDataJson: JSON.parse(r.editedData),
        mergedHtml: null,
        mergeStatus: null,
        error: null
      })));
      setCurrentMergeIndex(0);
      setMergedHtmlPreview('');
    }

    if (activeStep < steps.length - 1) { 
      setActiveStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStep === 1) {
      // Optionnel: demander confirmation si on veut quitter la génération en cours ou réinitialiser
      setSuggestionsToGenerate([]);
      setGenerationStatus([]);
    } else if (activeStep === 3) {
      // Revenir à l'édition
      setResourcesToMerge([]);
      setFinalMergedResources([]);
      setMergedHtmlPreview('');
      setHtmlMergeError(null);
    }
    setActiveStep(prev => Math.max(0, prev - 1));
  };

  const handleResourceEditChange = (index, newJsonString) => {
    const updatedResources = [...editedResources];
    updatedResources[index] = { ...updatedResources[index], editedData: newJsonString };
    setEditedResources(updatedResources);
  };

  const handleToggleConserveResource = (index) => {
    const updatedResources = [...editedResources];
    updatedResources[index] = { ...updatedResources[index], conserved: !updatedResources[index].conserved };
    setEditedResources(updatedResources);
  };

  const handleNextEditItem = () => {
    if (currentEditIndex < resourcesToEdit.length - 1) {
      setCurrentEditIndex(currentEditIndex + 1);
    }
  };

  const handlePrevEditItem = () => {
    if (currentEditIndex > 0) {
      setCurrentEditIndex(currentEditIndex - 1);
    }
  };

  // Fonction pour fusionner automatiquement tous les exercices avec leurs templates appropriés
  const autoMergeAllResources = async () => {
    if (resourcesToMerge.length === 0) {
      setHtmlMergeError("Aucun exercice à fusionner.");
      return;
    }

    setIsMerging(true);
    setHtmlMergeError(null);
    setMergedHtmlPreview('');

    const token = localStorage.getItem('token');
    if (!token) {
      setHtmlMergeError(formatErrorMessage("Token manquant", "Erreur d'authentification"));
      setIsMerging(false);
      return;
    }

    // Créer une copie des ressources à fusionner pour les mettre à jour au fur et à mesure
    const updatedFinalResources = [...finalMergedResources];

    // Traiter chaque ressource séquentiellement
    for (let i = 0; i < resourcesToMerge.length; i++) {
      setCurrentMergeIndex(i); // Mettre à jour l'index actuel pour l'affichage
      const currentResource = resourcesToMerge[i];

      // Vérifier que les données sont disponibles dans la structure attendue
      // À l'étape 3, les données sont dans editedDataJson, pas dans data.generated_content
      if (!currentResource || !currentResource.editedDataJson) {
        console.error(`Ressource ${i} invalide pour la fusion:`, currentResource);
        updatedFinalResources[i] = {
          ...updatedFinalResources[i],
          error: "Données de ressource invalides pour la fusion",
          mergeStatus: 'error'
        };
        continue; // Passer à la ressource suivante
      }

      try {
        // Utiliser directement les données JSON déjà parsées
        const jsonDataToMerge = currentResource.editedDataJson;

        // Appeler l'API pour fusionner avec le template approprié
        // L'API backend va automatiquement sélectionner le bon template en fonction du type/sous-type
        console.log(`Fusion de la ressource ${i} (${currentResource.suggestion.type_key}/${currentResource.suggestion.subtype_key})`, jsonDataToMerge);
        
        // Créer un FormData pour l'envoi (l'API attend des données au format Form)
        const formData = new FormData();
        formData.append('type_key', currentResource.suggestion.type_key);
        formData.append('subtype_key', currentResource.suggestion.subtype_key);
        formData.append('data_json', JSON.stringify(jsonDataToMerge));
        
        const response = await api.post('/ai/merge-resource', formData, { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        });
        
        // Afficher la réponse complète pour débogage
        console.log(`Réponse de fusion pour ressource ${i}:`, response.data);
        
        // Mettre à jour la ressource dans finalMergedResources avec le HTML fusionné
        updatedFinalResources[i] = {
          ...updatedFinalResources[i],
          // Le backend retourne html_url et html_path, pas merged_html
          mergedHtml: response.data.html_path, // Chemin du fichier HTML pour la sauvegarde
          html_url: response.data.html_url, // URL pour visualiser le HTML
          template_path: response.data.template_path || "Template par défaut",
          mergeStatus: 'success',
          conserved: true, // Par défaut, on conserve la ressource
          error: null
        };

        // Si c'est la ressource actuellement affichée, mettre à jour la prévisualisation
        if (i === currentMergeIndex) {
          setMergedHtmlPreview(response.data.merged_html);
        }

      } catch (err) {
        console.error(`Erreur lors de la fusion de la ressource ${i}:`, err);
        const errorMessage = formatErrorMessage(err, "Erreur lors de la fusion avec le template");
        
        // Mettre à jour la ressource avec l'erreur
        updatedFinalResources[i] = {
          ...updatedFinalResources[i],
          mergedHtml: '',
          mergeStatus: 'error',
          error: errorMessage
        };

        // Si c'est la ressource actuellement affichée, effacer la prévisualisation
        if (i === currentMergeIndex) {
          setMergedHtmlPreview('');
          setHtmlMergeError(errorMessage);
        }
      }
    }

    // Mettre à jour l'état avec toutes les ressources fusionnées
    setFinalMergedResources(updatedFinalResources);
    setIsMerging(false);
  };

  // Effet pour déclencher la fusion automatique quand on arrive à l'étape 3
  React.useEffect(() => {
    if (activeStep === 3 && resourcesToMerge.length > 0 && !isMerging && 
        finalMergedResources.every(r => !r.mergeStatus || r.mergeStatus === 'pending')) {
      console.log("Démarrage automatique de la fusion des ressources...");
      autoMergeAllResources();
    }
  }, [activeStep, resourcesToMerge, isMerging, finalMergedResources, autoMergeAllResources]);

  const handlePrevMergeItem = () => {
    if (currentMergeIndex > 0) {
      setCurrentMergeIndex(currentMergeIndex - 1);
      // Mettre à jour la prévisualisation pour l'élément actuel
      if (finalMergedResources[currentMergeIndex - 1]?.mergedHtml) {
        setMergedHtmlPreview(finalMergedResources[currentMergeIndex - 1].mergedHtml);
      } else {
        setMergedHtmlPreview('');
      }
    }
  };

  const handleNextMergeItem = () => {
    if (currentMergeIndex < resourcesToMerge.length - 1) {
      setCurrentMergeIndex(currentMergeIndex + 1);
      // Mettre à jour la prévisualisation pour l'élément actuel
      if (finalMergedResources[currentMergeIndex + 1]?.mergedHtml) {
        setMergedHtmlPreview(finalMergedResources[currentMergeIndex + 1].mergedHtml);
      } else {
        setMergedHtmlPreview('');
      }
    }
  };
  
  // Fonction pour basculer la conservation d'une ressource fusionnée
  const handleToggleResourceConservation = (index) => {
    if (index >= 0 && index < finalMergedResources.length) {
      const updatedResources = [...finalMergedResources];
      updatedResources[index] = {
        ...updatedResources[index],
        conserved: !updatedResources[index].conserved
      };
      setFinalMergedResources(updatedResources);
    }
  };

  // Fonction pour vérifier si toutes les fusions sont complètes (ou en erreur) pour activer le bouton Suivant.
  const areAllMergesAttempted = () => {
    return finalMergedResources.every(r => r.mergeStatus === 'success' || r.mergeStatus === 'error');
  };

  // Fonction pour sauvegarder les ressources sélectionnées
  const handleSaveResources = async () => {
    const resourcesToSave = getResourcesReadyForSave();
    if (resourcesToSave.length === 0) {
      alert("Aucune ressource n'est prête à être enregistrée.");
      return;
    }

    setIsSavingResources(true);
    setSaveError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Token d'authentification manquant");

      // Tableau pour stocker les ressources créées avec succès
      const createdResources = [];
      
      // Créer chaque ressource individuellement
      for (const resource of resourcesToSave) {
        // Préparer les données pour l'API
        const formData = new FormData();
        formData.append('title', resource.suggestion.title || `${resource.suggestion.type_key} - ${resource.suggestion.subtype_key}`);
        formData.append('description', resource.suggestion.justification || '');
        
        // Récupérer les IDs de type et sous-type à partir des clés
        const typeSubtypeMapping = {
          // Mapping des clés vers les IDs (exemple)
          'exercice': { id: 1, subtypes: { 'qcm': 1, 'vocabulaire': 2, 'champlex': 3 } },
          'document': { id: 2, subtypes: { 'texte': 4, 'audio': 5, 'video': 6 } }
        };
        
        const typeKey = resource.suggestion.type_key;
        const subtypeKey = resource.suggestion.subtype_key;
        
        // Utiliser les mappings ou des valeurs par défaut
        const typeId = typeSubtypeMapping[typeKey]?.id || 1;
        const subtypeId = typeSubtypeMapping[typeKey]?.subtypes[subtypeKey] || 1;
        
        formData.append('type_id', typeId);
        formData.append('sub_type_id', subtypeId);
        formData.append('source_type', 'ai');
        
        // Ajouter l'ID de session
        const sessionIdsJson = JSON.stringify([parseInt(sessionId, 10)]);
        formData.append('session_ids_json', sessionIdsJson);
        
        // Ajouter le chemin du fichier HTML généré
        if (resource.mergedHtml) {
          formData.append('html_path', resource.mergedHtml);
        }
        
        // Ajouter les métadonnées
        const metadata = JSON.stringify({
          template_path: resource.template_path || "Template automatique",
          generated_by_ai: true,
          content_json: JSON.stringify(resource.editedDataJson)
        });
        formData.append('metadata', metadata);
        
        // Appel API pour créer la ressource
        console.log(`Création de la ressource ${typeKey}/${subtypeKey}...`);
        const response = await api.post('/resources/', formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log(`Ressource ${typeKey}/${subtypeKey} créée avec succès:`, response.data);
        createdResources.push(response.data);
      }

      // Notifier le parent que des ressources ont été générées
      if (onResourcesGenerated) {
        onResourcesGenerated(createdResources);
      }

      // Afficher un message de succès et fermer le wizard en demandant un rafraîchissement
      alert(`${createdResources.length} ressource(s) ont été enregistrées avec succès.`);
      // Appeler onClose avec true pour indiquer qu'un rafraîchissement est nécessaire
      if (onClose) {
        onClose(true);
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde des ressources:", err);
      setSaveError(formatErrorMessage(err, "Erreur lors de la sauvegarde des ressources"));
    }

    setIsSavingResources(false);
  };

  const getResourcesReadyForSave = () => {
    // Ne retourner que les ressources qui ont été fusionnées avec succès ET qui sont conservées
    return finalMergedResources.filter(r => r.mergeStatus === 'success' && r.mergedHtml && r.conserved !== false);
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Stepper activeStep={activeStep} alternativeLabel={!isMobile} orientation={isMobile ? "vertical" : "horizontal"}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <SuggestionStep
          suggestions={suggestions}
          isLoadingSuggestions={isLoadingSuggestions}
          suggestionsError={suggestionsError}
          selectedSuggestionsIndices={selectedSuggestionsIndices}
          handleToggleSuggestion={handleToggleSuggestion}
          handleNextStep={handleNextStep}
          onClose={onClose}
        />
      )}

      {activeStep === 1 && (
        <GenerationStep
          generationStatus={generationStatus}
          isGenerating={isGenerating}
          allGenerationsDone={generationStatus.every(s => s.status === 'success' || s.status === 'error')}
          handlePrevStep={handlePrevStep}
          handleNextStep={handleNextStep}
          formatErrorMessage={formatErrorMessage}
        />
      )}

      {activeStep === 2 && (
        <EditStep
          resourcesToEdit={resourcesToEdit}
          editedResources={editedResources}
          currentEditIndex={currentEditIndex}
          handleResourceEditChange={handleResourceEditChange}
          handleToggleConserveResource={handleToggleConserveResource}
          handlePrevStep={handlePrevStep}
          handleNextStep={handleNextStep}
          handlePrevEditItem={handlePrevEditItem}
          handleNextEditItem={handleNextEditItem}
        />
      )}

      {activeStep === 3 && (
        <MergeStep
          resourcesToMerge={resourcesToMerge}
          currentMergeIndex={currentMergeIndex}
          finalMergedResources={finalMergedResources}
          isMerging={isMerging}
          htmlMergeError={htmlMergeError}
          mergedHtmlPreview={mergedHtmlPreview}
          handlePrevStep={handlePrevStep}
          handleSaveResources={handleSaveResources}
          handlePrevMergeItem={handlePrevMergeItem}
          handleNextMergeItem={handleNextMergeItem}
          areAllMergesAttempted={areAllMergesAttempted}
          handleToggleResourceConservation={handleToggleResourceConservation}
          isSavingResources={isSavingResources}
          saveError={saveError}
        />
      )}
    </Box>
  );
};

ResourceGenerationWizard.propTypes = {
  sessionId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onResourcesGenerated: PropTypes.func.isRequired
};

export default ResourceGenerationWizard;
