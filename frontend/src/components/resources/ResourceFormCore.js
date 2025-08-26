import React from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Grid,
  IconButton,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Import hooks
import { useResourceForm } from './hooks/useResourceForm';
import { useResourceHtmlEditor } from './hooks/useResourceHtmlEditor';

// Import components
import ResourceBasicFields from './components/ResourceBasicFields';
import ResourceTypeSelector from './components/ResourceTypeSelector';
import ResourceSourceSelector from './components/ResourceSourceSelector';
import ResourceFileUploader from './components/ResourceFileUploader';
import ResourceStudyObjectsSelector from './components/ResourceStudyObjectsSelector';
import ResourceOeuvresSelector from './components/ResourceOeuvresSelector';
import ResourceHtmlEditor from './components/ResourceHtmlEditor';
import ResourceAIGenerator from './components/ResourceAIGenerator';
import ResourceFormActions from './components/ResourceFormActions';
import ResourceHtmlEditingMode from './components/ResourceHtmlEditingMode';

/**
 * Main resource form component - orchestrates all the smaller components
 */
const ResourceFormCore = ({
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
  // Use custom hooks for state management
  const formHook = useResourceForm({
    session,
    initialData,
    isEdit,
    onSuccess,
    resourceId,
    initialSourceType,
    forcedType,
    allowedMimeTypesOverride,
  });

  const htmlEditorHook = useResourceHtmlEditor({
    initialData,
    isEdit,
    resourceId,
    formatError: formHook.formatError,
  });

  // Destructure hook returns for easier access
  const {
    formData,
    sourceType,
    selectedFile,
    fileError,
    error,
    success,
    submitting,
    setSubmitting,
    setError,
    setSuccess,
    resourceTypes,
    resourceSubTypes,
    loadingTypes,
    allStudyObjects,
    selectedStudyObjects,
    setSelectedStudyObjects,
    allOeuvres,
    selectedOeuvres,
    setSelectedOeuvres,
    MAX_UPLOAD_SIZE_MB,
    ALLOWED_FILE_TYPES,
    ALLOWED_FILE_TYPES_LABEL,
    selectedType,
    selectedSubType,
    handleInputChange,
    handleFileChange,
    handleSourceTypeChange,
    handleSubmit,
    navigate,
  } = formHook;

  const {
    htmlContent,
    tempHtmlContent,
    setTempHtmlContent,
    isEditingMode,
    showAiChat,
    setShowAiChat,
    aiLoading,
    setAiLoading,
    showHtmlEditor,
    handleEditContent,
    handleActivateAI,
    handleSaveHtmlContent: originalHandleSaveHtmlContent,
    handleCancelEditing,
  } = htmlEditorHook;

  // Enhanced save handler with error handling
  const handleSaveHtmlContent = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      const result = await originalHandleSaveHtmlContent();
      setSuccess(result.message);
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Computed values for form logic
  const hasSelectedType = Boolean(selectedType) || Boolean(hideTypeSelection && forcedType && forcedType.typeId);
  const hasSelectedSubType = Boolean(selectedSubType) || Boolean(hideTypeSelection && forcedType && forcedType.subtypeId);
  
  const isCreateMode = !isEdit;
  const hasForcedSubtype = Boolean(forcedType && forcedType.subtypeId);
  const hasFormSubtype = Boolean(formData.resource_sub_type_id && String(formData.resource_sub_type_id).trim() !== '');
  const mustHaveSubtype = isCreateMode;
  const missingSubtype = mustHaveSubtype && !(hasFormSubtype || hasForcedSubtype);
  
  const showAIGenerationForm = !isEdit && sourceType === 'ai' && hasSelectedType && hasSelectedSubType;

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

  // Debug logging
  console.log('[DEBUG ResourceFormCore] État du formulaire IA:', {
    sourceType,
    hasSelectedType,
    hasSelectedSubType,
    formData: {
      resource_type_id: formData.resource_type_id,
      resource_sub_type_id: formData.resource_sub_type_id
    },
    forcedType,
    hideTypeSelection,
    showAIGenerationForm
  });

  // Form content
  const formContent = (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      {!isEditingMode ? (
        // Standard mode: show all form fields
        <Grid container spacing={3}>
          <ResourceBasicFields
            formData={formData}
            handleInputChange={handleInputChange}
            submitting={submitting}
          />

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
            handleSaveHtmlContent={handleSaveHtmlContent}
            handleCancelEditing={handleCancelEditing}
            setAiLoading={setAiLoading}
          />

          <ResourceStudyObjectsSelector
            allStudyObjects={allStudyObjects}
            selectedStudyObjects={selectedStudyObjects}
            setSelectedStudyObjects={setSelectedStudyObjects}
            submitting={submitting}
            hideStudyObjectSelection={hideStudyObjectSelection}
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
      ) : (
        // Editing mode: show only HTML editor (handled separately for full-screen)
        <ResourceHtmlEditingMode
          tempHtmlContent={tempHtmlContent}
          setTempHtmlContent={setTempHtmlContent}
          showAiChat={showAiChat}
          setShowAiChat={setShowAiChat}
          aiLoading={aiLoading}
          submitting={submitting}
          handleActivateAI={handleActivateAI}
          handleSaveHtmlContent={handleSaveHtmlContent}
          handleCancelEditing={handleCancelEditing}
          setAiLoading={setAiLoading}
        />
      )}
    </>
  );

  // Render based on mode
  if (isEditingMode) {
    // Full-screen editing mode
    return (
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1300, bgcolor: 'background.default' }}>
        {formContent}
      </Box>
    );
  }

  return isDialog ? (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableEnforceFocus
      PaperProps={{
        sx: {
          overflow: "visible",
          minHeight: '80vh'
        },
      }}
    >
      <DialogTitle>
        {isEdit ? 'Modifier la ressource' : 'Créer une ressource'}
        {onClose && (
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          {formContent}
        </form>
      </DialogContent>
      <DialogActions>
        {actionButtons}
      </DialogActions>
    </Dialog>
  ) : (
    <Box sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            {isEdit ? 'Modifier la ressource' : 'Créer une ressource'}
          </Typography>
        </Box>
        {formContent}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {actionButtons}
        </Box>
      </form>
    </Box>
  );
};

export default ResourceFormCore;