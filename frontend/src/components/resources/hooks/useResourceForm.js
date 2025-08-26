import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import resourceTypeService from '../../../services/resourceTypeService';
import resourceService from '../../../services/resourceService';
import studyObjectService from '../../../services/studyObjectService';
import oeuvreService from '../../../services/oeuvreService';
import configService from '../../../services/configService';

/**
 * Custom hook for managing resource form state and logic
 */
export const useResourceForm = ({
  session,
  initialData = null,
  isEdit = false,
  onSuccess,
  resourceId,
  initialSourceType = 'ai',
  forcedType = null,
  allowedMimeTypesOverride = null,
}) => {
  const navigate = useNavigate();

  // Form data state
  const [formData, setFormData] = useState({
    title: '',
    resource_type_id: '',
    resource_sub_type_id: '',
    session_ids: session ? [session.id] : []
  });

  // UI state
  const [sourceType, setSourceType] = useState('ai');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Data state
  const [resourceTypes, setResourceTypes] = useState([]);
  const [resourceSubTypes, setResourceSubTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [allStudyObjects, setAllStudyObjects] = useState([]);
  const [selectedStudyObjects, setSelectedStudyObjects] = useState([]);
  const [allOeuvres, setAllOeuvres] = useState([]);
  const [selectedOeuvres, setSelectedOeuvres] = useState([]);

  // Configuration state
  const [uploadConfig, setUploadConfig] = useState({
    max_upload_size_mb: 10,
    max_upload_size_bytes: 10 * 1024 * 1024,
    allowed_mime_types: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'audio/mpeg',
      'video/mp4',
    ],
  });

  // Computed values
  const MAX_UPLOAD_SIZE_MB = uploadConfig.max_upload_size_mb;
  const MAX_FILE_SIZE = uploadConfig.max_upload_size_bytes;
  const ALLOWED_FILE_TYPES = (allowedMimeTypesOverride && Array.isArray(allowedMimeTypesOverride) && allowedMimeTypesOverride.length > 0)
    ? allowedMimeTypesOverride
    : (uploadConfig.allowed_mime_types || []);
  
  const ALLOWED_FILE_TYPES_LABEL = (() => {
    const pretty = {
      'application/pdf': 'PDF',
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'text/plain': 'TXT',
      'audio/mpeg': 'MP3',
      'video/mp4': 'MP4',
    };
    const labels = (ALLOWED_FILE_TYPES || []).map(t => pretty[t] || t);
    return labels.join(', ');
  })();

  const selectedType = resourceTypes.find(t => String(t.id) === String(formData.resource_type_id));
  const selectedSubType = resourceSubTypes.find(st => String(st.id) === String(formData.resource_sub_type_id));

  // Load upload configuration
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const cfg = await configService.getUploadConfig();
        if (!ignore && cfg) setUploadConfig(cfg);
      } catch (err) {
        console.warn("[useResourceForm] Impossible de charger la config d'upload, utilisation des valeurs par défaut.", err);
      }
    })();
    return () => { ignore = true; };
  }, []);

  // Load resource types
  const fetchResourceTypes = useCallback(async () => {
    try {
      setLoadingTypes(true);
      const types = await resourceTypeService.getAllTypes();
      setResourceTypes(types);
      setLoadingTypes(false);
    } catch (err) {
      console.error('Erreur lors du chargement des types de ressources:', err);
      setError('Impossible de charger les types de ressources');
      setLoadingTypes(false);
    }
  }, []);

  useEffect(() => {
    fetchResourceTypes();
  }, [fetchResourceTypes]);

  // Load subtypes
  const fetchSubTypes = useCallback(async (typeId) => {
    if (!typeId) {
      setResourceSubTypes([]);
      setFormData(prev => ({ ...prev, resource_sub_type_id: '' }));
      return;
    }
    try {
      const subTypes = await resourceTypeService.getSubtypesByType(typeId);
      setResourceSubTypes(subTypes);
    } catch (err) {
      console.error('Erreur lors du chargement des sous-types:', err);
      setError("Impossible de charger les sous-types pour ce type. Détails: " + (err.response?.data?.detail || err.message));
    }
  }, []);

  useEffect(() => {
    if (formData.resource_type_id) {
      fetchSubTypes(formData.resource_type_id);
    }
  }, [formData.resource_type_id, fetchSubTypes]);

  // Load study objects
  useEffect(() => {
    const fetchStudyObjects = async () => {
      try {
        const objs = await studyObjectService.getStudyObjects(0, 100);
        setAllStudyObjects(objs.items || objs);
      } catch (err) {
        setAllStudyObjects([]);
      }
    };
    fetchStudyObjects();
  }, []);

  // Load oeuvres
  useEffect(() => {
    const fetchOeuvres = async () => {
      try {
        const data = await oeuvreService.getOeuvres({ skip: 0, limit: 100 });
        setAllOeuvres(data.items || data);
      } catch (err) {
        setAllOeuvres([]);
      }
    };
    fetchOeuvres();
  }, []);

  // Initialize form with initial data
  useEffect(() => {
    if (forcedType && forcedType.typeId) {
      setFormData(prev => ({
        ...prev,
        resource_type_id: String(forcedType.typeId),
        resource_sub_type_id: forcedType.subtypeId ? String(forcedType.subtypeId) : ''
      }));
    }
  }, [forcedType]);

  useEffect(() => {
    if (initialSourceType && sourceType !== initialSourceType) {
      setSourceType(initialSourceType);
    }
  }, [initialSourceType]);

  useEffect(() => {
    if (initialData && resourceTypes.length > 0) {
      const initialTypeId = initialData.type_id ? String(initialData.type_id) : '';
      const initialSubTypeId = initialData.sub_type_id ? String(initialData.sub_type_id) : '';

      setFormData(prev => {
        const merged = {
          ...prev,
          ...initialData,
          title: initialData.title || prev.title || '',
          description: initialData.description || prev.description || '',
          session_ids: initialData.session_ids || (session ? [session.id] : (prev.session_ids || [])),
          url: initialData.url || prev.url || '',
        };
        if (initialTypeId) {
          merged.resource_type_id = initialTypeId;
        }
        if (initialSubTypeId) {
          merged.resource_sub_type_id = initialSubTypeId;
        }
        return merged;
      });

      if (initialData.source_type) {
        setSourceType(initialData.source_type);
      }
      if (Array.isArray(initialData.study_objects)) {
        setSelectedStudyObjects(initialData.study_objects);
      } else if (Array.isArray(initialData.study_object_ids) && Array.isArray(allStudyObjects) && allStudyObjects.length > 0) {
        setSelectedStudyObjects(allStudyObjects.filter(obj => initialData.study_object_ids.includes(obj.id)));
      }
      if (Array.isArray(initialData.oeuvres)) {
        setSelectedOeuvres(initialData.oeuvres);
      } else if (Array.isArray(initialData.oeuvre_ids) && Array.isArray(allOeuvres) && allOeuvres.length > 0) {
        setSelectedOeuvres(allOeuvres.filter(o => initialData.oeuvre_ids.includes(o.id)));
      }

      if (initialTypeId) {
        fetchSubTypes(initialTypeId);
      }
    } else if (!isEdit && session) {
      setFormData(prev => ({ ...prev, session_ids: [session.id] }));
    }
  }, [initialData, resourceTypes, session, isEdit, allStudyObjects, allOeuvres]);

  // Event handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'resource_type_id') {
      setFormData(prev => ({ ...prev, resource_sub_type_id: '' }));
      fetchSubTypes(value);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setFileError(`Type de fichier non autorisé. Types autorisés: ${ALLOWED_FILE_TYPES_LABEL}.`);
        setSelectedFile(null);
      } else if (file.size > MAX_FILE_SIZE) {
        setFileError(`Fichier trop volumineux (max ${MAX_UPLOAD_SIZE_MB} Mo).`);
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setFileError('');
      }
    } else {
      setSelectedFile(null);
      setFileError('');
    }
  };

  const handleSourceTypeChange = (e) => {
    setSourceType(e.target.value);
    if (e.target.value === 'file') {
      setSelectedFile(null);
      setFileError('');
    }
  };

  // Helper function for error formatting
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

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    // Validation
    const isCreateModeLocal = !isEdit;
    const hasForcedSubtypeLocal = Boolean(forcedType && forcedType.subtypeId);
    const hasFormSubtypeLocal = Boolean(formData.resource_sub_type_id && String(formData.resource_sub_type_id).trim() !== '');
    if (isCreateModeLocal && !(hasForcedSubtypeLocal || hasFormSubtypeLocal)) {
      setError('Veuillez sélectionner un sous-type avant de créer.');
      setSubmitting(false);
      return;
    }

    if (sourceType === 'file' && !selectedFile && !isEdit) {
      setFileError(`Veuillez sélectionner un fichier (${ALLOWED_FILE_TYPES_LABEL}).`);
      setError('Champ manquant.');
      setSubmitting(false);
      return;
    }
    if (sourceType === 'file' && fileError) {
      setError('Veuillez corriger les erreurs du fichier.');
      setSubmitting(false);
      return;
    }

    // Prepare form data
    const dataToSend = new FormData();

    if (formData.title) dataToSend.append('title', formData.title);
    if (formData.description) dataToSend.append('description', formData.description);

    if (formData.resource_type_id) {
      const typeId = Number(formData.resource_type_id);
      if (!Number.isNaN(typeId)) dataToSend.append('type_id', typeId);
    }
    const subTypeId = Number(formData.resource_sub_type_id);
    if (!Number.isNaN(subTypeId)) dataToSend.append('sub_type_id', subTypeId);

    const backendSourceType = sourceType === 'url' ? 'ai' : sourceType;
    dataToSend.append('source_type', backendSourceType);

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

    if (Array.isArray(formData.objective_ids)) {
      const objectiveIds = formData.objective_ids
        .map(id => Number(id))
        .filter(id => !Number.isNaN(id));
      dataToSend.append('objective_ids_json', JSON.stringify(objectiveIds));
    }

    const oeuvreIds = Array.isArray(selectedOeuvres)
      ? selectedOeuvres.map(o => Number(o.id)).filter(id => !Number.isNaN(id))
      : [];
    if (isEdit) {
      dataToSend.append('oeuvre_ids_json', JSON.stringify(oeuvreIds));
    } else if (oeuvreIds.length > 0) {
      dataToSend.append('oeuvre_ids_json', JSON.stringify(oeuvreIds));
    }

    if (sourceType === 'file' && selectedFile) {
      dataToSend.append('file', selectedFile);
    }

    try {
      let response;

      if (isEdit) {
        response = await resourceService.update(resourceId, dataToSend);
        setSuccess('Ressource mise à jour avec succès!');
      } else {
        response = await resourceService.create(dataToSend);
        setSuccess('Ressource créée avec succès!');
      }

      if (onSuccess) {
        await onSuccess(response);
      }

      if (!isEdit) {
        setSourceType('ai');
        setSelectedFile(null);
        setFileError('');
      }

      return response;
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la ressource:', err);
      const raw = err?.response?.data?.detail ?? err?.response?.data ?? err?.message ?? 'Une erreur est survenue lors de la sauvegarde.';
      const displayError = formatError(raw);
      setError(displayError);

      const lower = (displayError || '').toLowerCase();
      if (lower.includes('fichier') || lower.includes('file')) {
        setFileError(displayError);
      }
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    // State
    formData,
    setFormData,
    sourceType,
    setSourceType,
    selectedFile,
    setSelectedFile,
    fileError,
    setFileError,
    error,
    setError,
    success,
    setSuccess,
    submitting,
    setSubmitting,
    resourceTypes,
    resourceSubTypes,
    loadingTypes,
    allStudyObjects,
    selectedStudyObjects,
    setSelectedStudyObjects,
    allOeuvres,
    selectedOeuvres,
    setSelectedOeuvres,
    uploadConfig,

    // Computed values
    MAX_UPLOAD_SIZE_MB,
    MAX_FILE_SIZE,
    ALLOWED_FILE_TYPES,
    ALLOWED_FILE_TYPES_LABEL,
    selectedType,
    selectedSubType,

    // Event handlers
    handleInputChange,
    handleFileChange,
    handleSourceTypeChange,
    handleSubmit,

    // Utilities
    formatError,
    navigate,
  };
};