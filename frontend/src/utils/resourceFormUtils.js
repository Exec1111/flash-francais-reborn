import { v4 as uuidv4 } from 'uuid';

/**
 * Utilitaires pour le formulaire de ressource
 */

/**
 * Formate les messages d'erreur
 */
export const formatError = (val) => {
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

/**
 * Valide les données du formulaire avant soumission
 */
export const validateFormData = (formData, isEdit, sourceType, selectedFile, fileError) => {
  if (sourceType === 'file' && !selectedFile && !isEdit) {
    return { isValid: false, error: `Veuillez sélectionner un fichier.` };
  }

  if (sourceType === 'file' && fileError) {
    return { isValid: false, error: 'Veuillez corriger les erreurs du fichier.' };
  }

  const isCreateMode = !isEdit;
  const hasFormSubtype = Boolean(formData.resource_sub_type_id && String(formData.resource_sub_type_id).trim() !== '');

  if (isCreateMode && !hasFormSubtype) {
    return { isValid: false, error: 'Veuillez sélectionner un sous-type avant de créer.' };
  }

  return { isValid: true };
};

/**
 * Prépare les données pour l'envoi au backend
 */
export const prepareFormDataForSubmission = (
  formData,
  sourceType,
  selectedFile,
  htmlContent,
  isEdit,
  selectedStudyObjects,
  selectedOeuvres
) => {
  const dataToSend = new FormData();

  // Add basic fields
  if (formData.title) dataToSend.append('title', formData.title);
  if (formData.description) dataToSend.append('description', formData.description);

  // Add type information
  if (formData.resource_type_id) {
    const typeId = Number(formData.resource_type_id);
    if (!Number.isNaN(typeId)) dataToSend.append('type_id', typeId);
  }

  const subTypeId = Number(formData.resource_sub_type_id);
  if (!Number.isNaN(subTypeId)) dataToSend.append('sub_type_id', subTypeId);

  // Add source type
  const backendSourceType = sourceType === 'url' ? 'ai' : sourceType;
  dataToSend.append('source_type', backendSourceType);

  // Add session IDs
  const sessionIds = Array.isArray(formData.session_ids)
    ? formData.session_ids.map(id => Number(id)).filter(id => !Number.isNaN(id))
    : [];

  if (isEdit) {
    if (Array.isArray(formData.session_ids)) {
      dataToSend.append('session_ids_json', JSON.stringify(sessionIds));
    }
  } else {
    dataToSend.append('session_ids_json', JSON.stringify(sessionIds));
  }

  // Add objective IDs if they exist
  if (Array.isArray(formData.objective_ids)) {
    const objectiveIds = formData.objective_ids
      .map(id => Number(id))
      .filter(id => !Number.isNaN(id));
    dataToSend.append('objective_ids_json', JSON.stringify(objectiveIds));
  }

  // Add oeuvre IDs
  const oeuvreIds = Array.isArray(selectedOeuvres)
    ? selectedOeuvres.map(o => Number(o.id)).filter(id => !Number.isNaN(id))
    : [];

  if (isEdit) {
    dataToSend.append('oeuvre_ids_json', JSON.stringify(oeuvreIds));
  } else if (oeuvreIds.length > 0) {
    dataToSend.append('oeuvre_ids_json', JSON.stringify(oeuvreIds));
  }

  // Add HTML content for edit mode
  if (isEdit && htmlContent) {
    dataToSend.append('html_content', htmlContent);
  }

  // Add file if provided
  if (sourceType === 'file' && selectedFile) {
    dataToSend.append('file', selectedFile);
  }

  return dataToSend;
};

/**
 * Génère un nom de fichier obfusqué pour le HTML
 */
export const generateObfuscatedFilename = () => {
  return `${uuidv4().replace(/-/g, '')}.html`;
};

/**
 * Crée un fichier HTML à partir du contenu
 */
export const createHtmlFileFromContent = (content, filename) => {
  const htmlBlob = new Blob([content], { type: 'text/plain' });
  return new File([htmlBlob], filename, { type: 'text/plain' });
};

/**
 * Détermine si une ressource est dynamique
 */
export const isDynamicResource = (initialData) => {
  const hasRuntimePath = Boolean(initialData?.runtime_html_path);
  const hasDataJson = Boolean(initialData?.data_json);
  const hasRuntimeUrl = Boolean(initialData?.runtime_html_url);

  return hasRuntimePath || hasDataJson || hasRuntimeUrl;
};

/**
 * Détermine s'il faut afficher l'éditeur HTML
 */
export const shouldShowHtmlEditor = (isEdit, initialData) => {
  return isEdit && !isDynamicResource(initialData);
};

/**
 * Détermine s'il faut afficher le formulaire de génération IA
 */
export const shouldShowAIGenerationForm = (isEdit, sourceType, selectedType, selectedSubType) => {
  return !isEdit && sourceType === 'ai' && Boolean(selectedType) && Boolean(selectedSubType);
};