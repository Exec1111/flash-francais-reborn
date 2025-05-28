import React, { useState, useEffect } from 'react';
import { Box, Stepper, Step, StepLabel, Paper, Typography } from '@mui/material';

// Hooks personnalisés
import useFormSchema from './hooks/useFormSchema';
import useFormValidation from './hooks/useFormValidation';
import useSubmitLogic from './hooks/useSubmitLogic';

// Composants d'étape
import ConfigurationStep from './components/ConfigurationStep';
import GenerationStep from './components/GenerationStep';
import EditingStep from './components/EditingStep';
import MergeStep from './components/MergeStep';
import DialogComponents from './components/DialogComponents';

/**
 * Composant principal de formulaire dynamique pour la génération de ressources IA
 * 
 * @param {Object} props - Propriétés du composant
 * @param {string} props.typeKey - Clé du type de ressource
 * @param {string} props.subtypeKey - Clé du sous-type de ressource
 * @param {Object} props.prefilledData - Données préchargées pour le formulaire (optionnel)
 * @param {Function} props.onSuccess - Callback appelé en cas de succès
 * @param {Function} props.onCancel - Callback appelé si l'utilisateur annule
 * @returns {JSX.Element} Composant React
 */
const DynamicAIForm = ({
  typeKey,
  subtypeKey,
  prefilledData,
  onSuccess,
  onCancel
}) => {
  // État pour l'étape active du stepper
  const [activeStep, setActiveStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Hooks personnalisés pour la gestion du formulaire
  const { 
    formSchema, 
    formData, 
    setFormData, 
    isLoading: schemaLoading, 
    error: schemaError,
    showAuthError,
    setShowAuthError
  } = useFormSchema({ typeKey, subtypeKey, prefilledData });
  
  // Débogage du schéma reçu
  useEffect(() => {
    if (formSchema && formSchema.fields) {
      console.log("Schéma complet reçu dans DynamicAIForm:", formSchema);
      
      // Vérifier la présence d'énumérations
      formSchema.fields.forEach(field => {
        if (field.enum || (field.validations && field.validations.enum)) {
          console.log(`Champ avec énumération trouvé: ${field.name}`, {
            enum: field.enum,
            validationsEnum: field.validations?.enum
          });
        }
      });
    }
  }, [formSchema]);
  
  const { 
    errors, 
    setErrors, 
    validateForm 
  } = useFormValidation(formData, formSchema);
  
  // Ajouter explicitement les clés de type aux données du formulaire
  const formDataWithTypes = {
    ...formData,
    typeKey,
    subtypeKey
  };
  
  const {
    isLoading: submitLoading,
    generationResults,
    currentEditIndex,
    setCurrentEditIndex,
    editedResults,
    setEditedResults,
    mergedResults,
    setMergedResults,
    progress,
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
  } = useSubmitLogic(formDataWithTypes, validateForm, handleSuccess);
  
  // Indicateur de chargement global
  const isLoading = schemaLoading || submitLoading;
  
  // Gestionnaire de succès intermédiaire (pour la génération)
  function handleSuccess(result) {
    // On ne redirige pas tout de suite, on stocke le résultat pour le traiter à la finalisation
    setShowSuccess(true);
    setSuccessMessage("Contenu généré avec succès ! Continuez vers l'étape suivante.");
    // Ne pas appeler onSuccess ici pour éviter la redirection prématurée
  }
  
  // Gestionnaire de succès final (pour la finalisation)
  function handleFinalSuccess(result) {
    if (onSuccess && typeof onSuccess === 'function') {
      onSuccess(result);
    }
    setShowSuccess(true);
    setSuccessMessage("Ressource générée et enregistrée avec succès !");
  }
  
  // Gestionnaire d'annulation
  const handleCancel = () => {
    if (onCancel && typeof onCancel === 'function') {
      onCancel();
    }
  };
  
  // Gestionnaires de navigation entre les étapes
  const handleNext = () => {
    // Si on passe de l'étape de configuration à l'étape de génération (0 -> 1),
    // déclencher automatiquement la génération
    const currentStep = activeStep;
    setActiveStep((prevStep) => prevStep + 1);
    
    // Déclencher la génération automatiquement quand on passe à l'étape 1
    if (currentStep === 0) {
      // Petit délai pour laisser le temps à l'étape de s'afficher
      setTimeout(() => {
        console.log("Déclenchement automatique de la génération");
        handleSubmit();
      }, 100);
    }
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  // Effet pour mettre à jour le contenu HTML local lorsque les résultats fusionnés changent
  useEffect(() => {
    if (mergedResults) {
      // Si le résultat est un objet avec une propriété HTML, l'utiliser
      if (typeof mergedResults === 'object' && mergedResults.contenu_html) {
        setLocalHtmlContent(mergedResults.contenu_html);
      } else if (typeof mergedResults === 'string') {
        setLocalHtmlContent(mergedResults);
      } else {
        // Sinon, convertir l'objet en chaîne JSON
        setLocalHtmlContent(JSON.stringify(mergedResults, null, 2));
      }
    }
  }, [mergedResults]);
  
  // Effet pour définir les données fusionnées lorsque les résultats sont générés
  useEffect(() => {
    if (generationResults.length > 0 && !mergedResults) {
      // Si un seul résultat, l'utiliser directement
      if (generationResults.length === 1) {
        setMergedResults(generationResults[0]);
      }
    }
  }, [generationResults]);
  
  // Étapes du stepper
  const steps = [
    'Configuration',
    'Génération',
    'Édition',
    'Finalisation'
  ];
  
  // Rendu conditionnel de l'étape active
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <ConfigurationStep 
            formSchema={formSchema}
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            isLoading={isLoading}
            error={schemaError}
            onNext={handleNext}
            validateForm={validateForm}
          />
        );
      case 1:
        return (
          <GenerationStep 
            onSubmit={handleSubmit}
            isLoading={isLoading}
            progress={progress}
            onPrev={handleBack}
            onNext={handleNext}
            canProceed={generationResults.length > 0}
          />
        );
      case 2:
        return (
          <EditingStep 
            editedResults={editedResults}
            currentEditIndex={currentEditIndex}
            onEditorChange={handleEditorChange}
            onPrevResult={handlePrevResult}
            onNextResult={handleNextResult}
            onPrev={handleBack}
            onNext={handleNext}
            isLoading={isLoading}
          />
        );
      case 3:
        return (
          <MergeStep 
            mergedResults={mergedResults}
            onMergeAll={handleMergeAll}
            onFinish={(result) => {
              handleFinish(result);
              // Appeler le callback de succès final ici pour déclencher la redirection
              handleFinalSuccess(result);
            }}
            onPrev={handleBack}
            isLoading={isLoading}
            mergeSuccess={mergeSuccess}
            localHtmlContent={localHtmlContent}
            setLocalHtmlContent={setLocalHtmlContent}
          />
        );
      default:
        return <Typography>Étape inconnue</Typography>;
    }
  };
  
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ width: '100%' }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box sx={{ mt: 4, mb: 2 }}>
          {renderStepContent()}
        </Box>
        
        <DialogComponents
          showAuthError={showAuthError}
          setShowAuthError={setShowAuthError}
          showSuccess={showSuccess}
          setShowSuccess={setShowSuccess}
          successMessage={successMessage}
        />
      </Box>
    </Paper>
  );
};

export default DynamicAIForm;
