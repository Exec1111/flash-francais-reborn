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

// Hooks
import { useWizard } from './hooks/useWizard';

// Composants d'étapes
import ConfigurationStep from '../wizard/ConfigurationStep';
import SuggestionStep from '../wizard/SuggestionStep';
import GenerationStep from '../wizard/GenerationStep';
import EditStep from '../wizard/EditStep';
import MergeStep from '../wizard/MergeStep';

// Utilitaires
import { formatErrorMessage } from './utils/formatters';

/**
 * Composant principal du wizard de génération de ressources pédagogiques
 * Version refactorisée avec une architecture modulaire
 */
const ResourceGenerationWizard = ({ sessionId, sessionTitle, sequenceId, onClose, onResourcesGenerated }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Utiliser le hook principal qui orchestre tout le wizard
  const wizard = useWizard(sessionId, onResourcesGenerated, onClose);
  
  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Stepper 
        activeStep={wizard.activeStep} 
        alternativeLabel={!isMobile} 
        orientation={isMobile ? "vertical" : "horizontal"}
      >
        {wizard.steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {wizard.activeStep === 0 && (
        <ConfigurationStep
          sessionId={sessionId}
          onContinue={wizard.handleConfigSubmit}
          onClose={onClose}
          initialConfig={wizard.configParams}
        />
      )}

      {wizard.activeStep === 1 && (
        <SuggestionStep
          suggestions={wizard.suggestions.suggestions}
          isLoadingSuggestions={wizard.suggestions.isLoadingSuggestions}
          suggestionsError={wizard.suggestions.suggestionsError}
          selectedSuggestionsIndices={wizard.suggestions.selectedSuggestionsIndices}
          handleToggleSuggestion={wizard.suggestions.handleToggleSuggestion}
          handleNextStep={wizard.handleNextStep}
          onClose={onClose}
        />
      )}

      {wizard.activeStep === 2 && (
        <GenerationStep
          generationStatus={wizard.generation.generationStatus}
          isGenerating={wizard.generation.isGenerating}
          allGenerationsDone={wizard.generation.areAllGenerationsDone()}
          handlePrevStep={wizard.handlePrevStep}
          handleNextStep={wizard.handleNextStep}
          formatErrorMessage={formatErrorMessage}
        />
      )}

      {wizard.activeStep === 3 && (
        <EditStep
          resourcesToEdit={wizard.editing.resourcesToEdit}
          editedResources={wizard.editing.editedResources}
          currentEditIndex={wizard.editing.currentEditIndex}
          handleResourceEditChange={wizard.editing.handleResourceEditChange}
          handleToggleConserveResource={wizard.editing.handleToggleConserveResource}
          handlePrevStep={wizard.handlePrevStep}
          handleNextStep={wizard.handleNextStep}
          handlePrevEditItem={wizard.editing.handlePrevEditItem}
          handleNextEditItem={wizard.editing.handleNextEditItem}
        />
      )}

      {wizard.activeStep === 4 && (
        <MergeStep
          resourcesToMerge={wizard.merging.resourcesToMerge}
          currentMergeIndex={wizard.merging.currentMergeIndex}
          finalMergedResources={wizard.merging.finalMergedResources}
          isMerging={wizard.merging.isMerging}
          htmlMergeError={wizard.merging.htmlMergeError}
          mergedHtmlPreview={wizard.merging.mergedHtmlPreview}
          handlePrevStep={wizard.handlePrevStep}
          handleSaveResources={wizard.saving.handleSaveResources}
          handlePrevMergeItem={wizard.merging.handlePrevMergeItem}
          handleNextMergeItem={wizard.merging.handleNextMergeItem}
          areAllMergesAttempted={wizard.merging.areAllMergesAttempted}
          handleToggleResourceConservation={wizard.merging.handleToggleResourceConservation}
          isSavingResources={wizard.saving.isSavingResources}
          saveError={wizard.saving.saveError}
        />
      )}
    </Box>
  );
};

ResourceGenerationWizard.propTypes = {
  sessionId: PropTypes.string.isRequired,
  sessionTitle: PropTypes.string,
  sequenceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClose: PropTypes.func.isRequired,
  onResourcesGenerated: PropTypes.func.isRequired
};

export default ResourceGenerationWizard;
