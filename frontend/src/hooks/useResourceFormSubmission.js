import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import resourceService from '../services/resourceService';
import {
  validateFormData,
  prepareFormDataForSubmission,
  createHtmlFileFromContent,
  generateObfuscatedFilename
} from '../utils/resourceFormUtils';

/**
 * Hook personnalisé pour gérer la soumission du formulaire de ressource
 */
export const useResourceFormSubmission = (
  formData,
  sourceType,
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
) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Validation
      const validation = validateFormData(formData, isEdit, sourceType, selectedFile, fileError);
      if (!validation.isValid) {
        setError(validation.error);
        setSubmitting(false);
        return;
      }

      // Prepare data for submission
      const dataToSend = prepareFormDataForSubmission(
        formData,
        sourceType,
        selectedFile,
        htmlContent,
        isEdit,
        selectedStudyObjects,
        selectedOeuvres
      );

      // Submit data
      let response;
      if (isEdit) {
        response = await resourceService.update(resourceId, dataToSend);
        setSuccess('Ressource mise à jour avec succès!');
      } else {
        response = await resourceService.create(dataToSend);
        setSuccess('Ressource créée avec succès!');
      }

      // Call success callback
      if (onSuccess) {
        await onSuccess(response);
      }

      // Handle post-submission navigation
      if (!isEdit) {
        // Reset form state for new resources
        // Note: sourceType reset is handled by parent component
      }

      if (isDialog && onClose) {
        onClose();
      }

      if (!disableNavigation && !isDialog) {
        navigate('/resources');
      }

    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la ressource:', err);
      const errorMessage = formatError(err?.response?.data?.detail ?? err?.response?.data ?? err?.message ?? 'Une erreur est survenue lors de la sauvegarde.');
      setError(errorMessage);
      const lower = (errorMessage || '').toLowerCase();
      if (lower.includes('fichier') || lower.includes('file')) {
        // File error is handled by file upload hook
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    formData,
    sourceType,
    selectedFile,
    fileError,
    htmlContent,
    isEdit,
    resourceId,
    selectedStudyObjects,
    selectedOeuvres,
    onSuccess,
    isDialog,
    onClose,
    disableNavigation,
    navigate
  ]);

  const handleSaveAsHtmlContent = useCallback(async (newTitle, tempHtmlContent) => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      if (!initialData || !resourceId) {
        throw new Error('Données de ressource manquantes pour la duplication');
      }

      // Create new resource data based on current resource
      const newResourceData = prepareFormDataForSubmission(
        { ...formData, title: newTitle },
        'file', // Set source_type to 'file' since we're sending HTML content as a file
        null, // No file selected, we'll create one from content
        null, // No HTML content in main form
        false, // This is a new resource
        selectedStudyObjects,
        selectedOeuvres
      );

      // Create HTML file from tempHtmlContent and send as file upload
      if (tempHtmlContent && tempHtmlContent.trim()) {
        const obfuscatedFilename = generateObfuscatedFilename();
        const htmlFile = createHtmlFileFromContent(tempHtmlContent, obfuscatedFilename);
        newResourceData.set('file', htmlFile);

        console.log('[DEBUG] Save As - HTML content converted to file:', {
          fileName: htmlFile.name,
          fileSize: htmlFile.size,
          fileType: htmlFile.type,
          obfuscated: true
        });
      } else {
        console.warn('[DEBUG] Save As - WARNING: tempHtmlContent is empty or invalid');
        throw new Error('Aucun contenu HTML à sauvegarder');
      }

      console.log('[DEBUG] Creating new resource with Save As:', {
        title: newTitle,
        originalResourceId: resourceId,
        hasHtmlContent: Boolean(tempHtmlContent && tempHtmlContent.trim()),
        htmlContentLength: tempHtmlContent ? tempHtmlContent.length : 0,
        sourceType: 'file'
      });

      // Create the new resource
      const newResource = await resourceService.create(newResourceData);

      console.log('[DEBUG] New resource created:', newResource);

      setSuccess(`Nouvelle ressource "${newTitle}" créée avec succès !`);

      // Navigate directly to edit the newly created resource
      console.log('[DEBUG] Navigating to edit new resource:', newResource.id);

      // Close dialog if we're in dialog mode
      if (isDialog && onClose) {
        onClose();
      }

      // For Save As, ALWAYS navigate to the new resource edit page
      // Use setTimeout to ensure navigation happens after all React state updates
      setTimeout(() => {
        console.log('[DEBUG] Save As - Executing delayed navigation to new resource:', newResource.id);
        navigate(`/resources/edit/${newResource.id}`, { replace: true });
      }, 100);

    } catch (error) {
      console.error('Erreur lors de la sauvegarde sous:', error);
      const displayError = formatError(error?.response?.data?.detail ?? error?.response?.data ?? error?.message ?? 'Erreur lors de la sauvegarde sous');
      setError(displayError);
      throw error; // Re-throw to let the component handle loading state
    } finally {
      setSubmitting(false);
    }
  }, [
    initialData,
    resourceId,
    formData,
    selectedStudyObjects,
    selectedOeuvres,
    isDialog,
    onClose,
    navigate
  ]);

  // Helper: format error messages
  const formatError = (val) => {
    try {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) {
        const parts = val.map((item) => {
          if (!item) return '';
          if (typeof item === 'string') return item;
          if (item.msg) {
            const loc = Array.isArray(item.loc) ? item.loc.join('.') : (item.loc || '');
            return loc ? `${item.msg} (${loc})` : String(item.msg);
          }
          if (item.detail) return formatError(item.detail);
          return JSON.stringify(item);
        }).filter(Boolean);
        return parts.join(' | ');
      }
      if (typeof val === 'object') {
        if (val.detail) return formatError(val.detail);
        if (val.msg) return String(val.msg);
        return JSON.stringify(val);
      }
      return String(val);
    } catch (_) {
      return 'Une erreur est survenue.';
    }
  };

  return {
    submitting,
    error,
    success,
    setError,
    setSuccess,
    handleSubmit,
    handleSaveAsHtmlContent
  };
};