import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Grid
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import resourceService from '../../services/resourceService';
import { useLayout } from '../../contexts/LayoutContext';

// Import refactored components
import {
  ResourceBasicFields,
  ResourceSourceSelector,
  ResourceTypeSelector,
  ResourceFileUploader,
  ResourceStudyObjectsSelector,
  ResourceOeuvresSelector,
  ResourceAIGenerator,
  ResourceHtmlEditor,
  ResourceHtmlEditingMode,
  ResourceFormActions
} from './components';

// Import new hooks and utilities
import { useResourceFormState } from '../../hooks/useResourceFormState';
import { useResourceHtmlContent } from '../../hooks/useResourceHtmlContent';
import { useResourceActivityLauncher } from '../../hooks/useResourceActivityLauncher';
import { useResourceFileUpload } from '../../hooks/useResourceFileUpload';
import { useResourceFormSubmission } from '../../hooks/useResourceFormSubmission';
import {
  shouldShowAIGenerationForm,
  shouldShowHtmlEditor,
  isDynamicResource
} from '../../utils/resourceFormUtils';

/**
 * Composant de formulaire réutilisable pour la création et l'édition de ressources
 * Orchestrates the various components for resource creation and editing
 */
const ResourceForm = ({
  open,
  onClose,
  session,
  isDialog = true,
  initialData = null,
  isEdit = false,
  onSuccess,
  resourceId,
  disableSourceSelection = false,
  prefilledAiData = null,
  hideTypeSelection = false,
  hideStudyObjectSelection = false,
  forcedType = null,
  disableNavigation = false,
  initialSourceType = 'ai',
  lockTypeSelection = false,
  allowedMimeTypesOverride = null,
}) => {
  const navigate = useNavigate();
  const { handleSidebarClose } = useLayout();

  // Use custom hooks for state management
  const {
    formData,
    setFormData,
    error: formError,
    setError: setFormError,
    success: formSuccess,
    setSuccess: setFormSuccess,
    submitting: formSubmitting,
    setSubmitting: setFormSubmitting,
    resourceTypes,
    resourceSubTypes,
    loadingTypes,
    selectedType,
    selectedSubType,
    allStudyObjects,
    selectedStudyObjects,
    setSelectedStudyObjects,
    allOeuvres,
    selectedOeuvres,
    setSelectedOeuvres,
    uploadConfig,
    MAX_UPLOAD_SIZE_MB,
    MAX_FILE_SIZE,
    ALLOWED_FILE_TYPES,
    ALLOWED_FILE_TYPES_LABEL,
    handleInputChange,
    fetchSubTypes
  } = useResourceFormState(initialData, session, isEdit, forcedType);

  const {
    showAiChat,
    setShowAiChat,
    isEditingMode,
    setIsEditingMode,
    tempHtmlContent,
    setTempHtmlContent,
    aiLoading,
    setAiLoading,
    htmlContent,
    setHtmlContent,
    isDynamicActivity,
    showHtmlEditor,
    isLoadingHtml,
    handleEditContent,
    handleActivateAI,
    handleSaveHtmlContent,
    handleCancelEditing,
    setHtmlCacheBuster,
    setPendingEditMode
  } = useResourceHtmlContent(initialData, resourceId, isEdit);

  const { handleLaunchActivity } = useResourceActivityLauncher(initialData);

  const {
    selectedFile,
    fileError,
    setFileError,
    handleFileChange,
    resetFileState
  } = useResourceFileUpload(ALLOWED_FILE_TYPES, MAX_FILE_SIZE, ALLOWED_FILE_TYPES_LABEL, MAX_UPLOAD_SIZE_MB);

  const {
    submitting,
    error,
    success,
    setError,
    setSuccess,
    handleSubmit,
    handleSaveAsHtmlContent
  } = useResourceFormSubmission(
    formData,
    initialSourceType, // We'll need to manage sourceType separately
    selectedFile,
    fileError,
    htmlContent,
    isEdit,
    resourceId,
    initialData,
    selectedStudyObjects,
    selectedOeuvres,
    onSuccess,
    isDialog,
    onClose,
    disableNavigation
  );

  // --- Additional State ---
  const [sourceType, setSourceType] = React.useState(initialSourceType);

  // --- Computed Values ---
  const subtypeKey = ((selectedSubType?.key) || (initialData?.sub_type?.key) || '').toLowerCase();
  const hasSelectedType = Boolean(selectedType) || Boolean(hideTypeSelection && forcedType && forcedType.typeId);
  const hasSelectedSubType = Boolean(selectedSubType) || Boolean(hideTypeSelection && forcedType && forcedType.subtypeId);
  const isCreateMode = !isEdit;
  const hasForcedSubtype = Boolean(forcedType && forcedType.subtypeId);
  const hasFormSubtype = Boolean(formData.resource_sub_type_id && String(formData.resource_sub_type_id).trim() !== '');
  const mustHaveSubtype = isCreateMode;
  const missingSubtype = mustHaveSubtype && !(hasFormSubtype || hasForcedSubtype);

  const showAIGenerationForm = shouldShowAIGenerationForm(isEdit, sourceType, selectedType, selectedSubType);

  // --- Event Handlers ---

  const handleSourceTypeChange = (e) => {
    const newSourceType = e.target.value;
    setSourceType(newSourceType);
    if (newSourceType === 'file') {
      resetFileState();
    }
  };

  // If we're in full-screen editing mode, use the dedicated component
  if (isEditingMode) {
    return (
      <ResourceHtmlEditingMode
        tempHtmlContent={tempHtmlContent}
        setTempHtmlContent={setTempHtmlContent}
        showAiChat={showAiChat}
        setShowAiChat={setShowAiChat}
        aiLoading={aiLoading}
        submitting={submitting}
        handleActivateAI={handleActivateAI}
        handleSaveHtmlContent={(resourceService) => handleSaveHtmlContent(resourceService)}
        handleSaveAsHtmlContent={handleSaveAsHtmlContent}
        handleCancelEditing={handleCancelEditing}
        setAiLoading={setAiLoading}
        initialData={initialData}
      />
    );
  }

  // Action buttons logic
  const actionButtons = (!isEdit && sourceType === 'ai') || isEditingMode ? null : (
    <ResourceFormActions
      isDialog={isDialog}
      onClose={onClose}
      navigate={navigate}
      submitting={submitting}
      missingSubtype={missingSubtype}
      handleSubmit={handleSubmit}
      isEdit={isEdit}
    />
  );

  // Form content
  const formContent = (
    <>
      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }}>{error || formError}</Alert>}
      {(success || formSuccess) && <Alert severity="success" sx={{ mb: 2 }}>{success || formSuccess}</Alert>}

      <Grid container spacing={3}>
        <ResourceBasicFields
          formData={formData}
          handleInputChange={handleInputChange}
          submitting={submitting}
        />

        {/* Section "Contenu HTML" pour les exercices dynamiques */}
        {isDynamicActivity && !isEditingMode && (
          <Grid item xs={12}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              py: 2
            }}>
              <Box sx={{
                color: '#e5e7eb',
                fontSize: '1.1rem',
                fontWeight: 500,
                minWidth: 'fit-content'
              }}>
                Contenu HTML (dynamique)
              </Box>

              <Box sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center'
              }}>
                {/* Bouton "Lancer l'activité" */}
                <Button
                  variant="text"
                  size="small"
                  onClick={handleLaunchActivity}
                  sx={{
                    color: '#60a5fa',
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    '&:hover': {
                      backgroundColor: 'rgba(96, 165, 250, 0.1)'
                    }
                  }}
                  startIcon={
                    <Box component="span" sx={{ fontSize: '0.875rem' }}>🚀</Box>
                  }
                >
                  Lancer l'activité
                </Button>

                {/* Bouton "Éditer le contenu" */}
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setIsEditingMode(true)}
                  disabled={submitting}
                  sx={{
                    backgroundColor: '#6366f1',
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    '&:hover': {
                      backgroundColor: '#5856eb'
                    },
                    '&:disabled': {
                      backgroundColor: '#9ca3af'
                    }
                  }}
                  startIcon={
                    <Box component="span" sx={{ fontSize: '0.875rem' }}>✏️</Box>
                  }
                >
                  Éditer le contenu
                </Button>
              </Box>
            </Box>
          </Grid>
        )}

        <ResourceHtmlEditor
          showHtmlEditor={showHtmlEditor}
          isEditingMode={isEditingMode}
          htmlContent={htmlContent}
          tempHtmlContent={tempHtmlContent}
          setTempHtmlContent={setTempHtmlContent}
          showAiChat={showAiChat}
          setShowAiChat={setShowAiChat}
          aiLoading={aiLoading}
          submitting={submitting}
          handleEditContent={handleEditContent}
          handleActivateAI={handleActivateAI}
          handleSaveHtmlContent={(resourceService) => handleSaveHtmlContent(resourceService)}
          handleSaveAsHtmlContent={handleSaveAsHtmlContent}
          handleCancelEditing={handleCancelEditing}
          setAiLoading={setAiLoading}
          initialData={initialData}
        />

        <ResourceStudyObjectsSelector
          hideStudyObjectSelection={hideStudyObjectSelection}
          allStudyObjects={allStudyObjects}
          selectedStudyObjects={selectedStudyObjects}
          setSelectedStudyObjects={setSelectedStudyObjects}
          submitting={submitting}
        />

        <ResourceOeuvresSelector
          allOeuvres={allOeuvres}
          selectedOeuvres={selectedOeuvres}
          setSelectedOeuvres={setSelectedOeuvres}
          submitting={submitting}
        />

        <ResourceTypeSelector
          formData={formData}
          handleInputChange={handleInputChange}
          resourceTypes={resourceTypes}
          resourceSubTypes={resourceSubTypes}
          loadingTypes={loadingTypes}
          submitting={submitting}
          hideTypeSelection={hideTypeSelection}
          lockTypeSelection={lockTypeSelection}
          forcedType={forcedType}
        />

        <ResourceSourceSelector
          sourceType={sourceType}
          handleSourceTypeChange={handleSourceTypeChange}
          submitting={submitting}
          disableSourceSelection={disableSourceSelection}
        />

        <ResourceFileUploader
          sourceType={sourceType}
          selectedFile={selectedFile}
          fileError={fileError}
          handleFileChange={handleFileChange}
          submitting={submitting}
          isEdit={isEdit}
          initialData={initialData}
          ALLOWED_FILE_TYPES={ALLOWED_FILE_TYPES}
          ALLOWED_FILE_TYPES_LABEL={ALLOWED_FILE_TYPES_LABEL}
          MAX_UPLOAD_SIZE_MB={MAX_UPLOAD_SIZE_MB}
        />

        <ResourceAIGenerator
          showAIGenerationForm={showAIGenerationForm}
          selectedType={selectedType}
          selectedSubType={selectedSubType}
          forcedType={forcedType}
          handleSubmit={handleSubmit}
          onSuccess={onSuccess}
          navigate={navigate}
          disableNavigation={disableNavigation}
          isEdit={isEdit}
          isDialog={isDialog}
          selectedStudyObjects={selectedStudyObjects}
          prefilledAiData={prefilledAiData}
          formData={formData}
        />
      </Grid>
    </>
  );

  // Render based on dialog mode
  if (isDialog) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          {isEdit ? 'Modifier la ressource' : 'Créer une nouvelle ressource'}
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {formContent}
        </DialogContent>
        {actionButtons && (
          <DialogActions>
            {actionButtons}
          </DialogActions>
        )}
      </Dialog>
    );
  }

  // Full-screen mode
  return (
    <Box sx={{ p: 3 }}>
      {formContent}
      {actionButtons && (
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {actionButtons}
        </Box>
      )}
    </Box>
  );
};

export default ResourceForm;
