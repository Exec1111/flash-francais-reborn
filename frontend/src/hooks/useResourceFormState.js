import { useState, useEffect } from 'react';
import resourceTypeService from '../services/resourceTypeService';
import studyObjectService from '../services/studyObjectService';
import oeuvreService from '../services/oeuvreService';
import configService from '../services/configService';

/**
 * Hook personnalisé pour gérer l'état du formulaire de ressource
 * Centralise la gestion des données et des sélections
 */
export const useResourceFormState = (initialData, session, isEdit, forcedType) => {
  // --- Core State ---
  const [formData, setFormData] = useState({
    title: '',
    resource_type_id: '',
    resource_sub_type_id: '',
    session_ids: session ? [session.id] : []
  });

  // --- Form States ---
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [resourceSubTypes, setResourceSubTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // --- Selection States ---
  const [allStudyObjects, setAllStudyObjects] = useState([]);
  const [selectedStudyObjects, setSelectedStudyObjects] = useState([]);
  const [allOeuvres, setAllOeuvres] = useState([]);
  const [selectedOeuvres, setSelectedOeuvres] = useState([]);

  // --- Upload Configuration ---
  const [uploadConfig, setUploadConfig] = useState({
    max_upload_size_mb: 10,
    max_upload_size_bytes: 10 * 1024 * 1024,
    allowed_mime_types: [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain', 'audio/mpeg', 'video/mp4'
    ]
  });

  // --- Computed Values ---
  const MAX_UPLOAD_SIZE_MB = uploadConfig.max_upload_size_mb;
  const MAX_FILE_SIZE = uploadConfig.max_upload_size_bytes;
  const ALLOWED_FILE_TYPES = uploadConfig.allowed_mime_types || [];
  const ALLOWED_FILE_TYPES_LABEL = (() => {
    const pretty = {
      'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG',
      'image/gif': 'GIF', 'text/plain': 'TXT', 'audio/mpeg': 'MP3', 'video/mp4': 'MP4'
    };
    const labels = (ALLOWED_FILE_TYPES || []).map(t => pretty[t] || t);
    return labels.join(', ');
  })();

  const selectedType = resourceTypes.find(t => String(t.id) === String(formData.resource_type_id));
  const selectedSubType = resourceSubTypes.find(st => String(st.id) === String(formData.resource_sub_type_id));

  // Initialize with forced type if provided
  useEffect(() => {
    if (forcedType && forcedType.typeId) {
      console.log('[DEBUG useResourceFormState] Type forcé détecté:', forcedType);
      setFormData(prev => ({
        ...prev,
        resource_type_id: String(forcedType.typeId),
        resource_sub_type_id: forcedType.subtypeId ? String(forcedType.subtypeId) : ''
      }));
    }
  }, [forcedType]);

  // Initialize form with existing data
  useEffect(() => {
    if (initialData && resourceTypes.length > 0) {
      console.log('[DEBUG useResourceFormState] initialData avant traitement:', initialData);
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
        if (initialTypeId) merged.resource_type_id = initialTypeId;
        if (initialSubTypeId) merged.resource_sub_type_id = initialSubTypeId;
        return merged;
      });

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

      if (initialTypeId) fetchSubTypes(initialTypeId);
    } else if (!isEdit && session) {
      setFormData(prev => ({ ...prev, session_ids: [session.id] }));
    }
  }, [initialData, resourceTypes, session, isEdit, allStudyObjects, allOeuvres]);

  // Load upload configuration
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const cfg = await configService.getUploadConfig();
        if (!ignore && cfg) setUploadConfig(cfg);
      } catch (err) {
        console.warn("[useResourceFormState] Impossible de charger la config d'upload, utilisation des valeurs par défaut.", err);
      }
    })();
    return () => { ignore = true; };
  }, []);

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

  // Data loading functions
  const fetchResourceTypes = async () => {
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
  };

  const fetchSubTypes = async (typeId) => {
    console.log('useResourceFormState - Fetching subtypes for Type ID:', typeId);
    if (!typeId) {
      setResourceSubTypes([]);
      setFormData(prev => ({ ...prev, resource_sub_type_id: '' }));
      return;
    }
    try {
      const subTypes = await resourceTypeService.getSubtypesByType(typeId);
      console.log('useResourceFormState - Subtypes received from API:', subTypes);
      setResourceSubTypes(subTypes);
    } catch (err) {
      console.error('Erreur lors du chargement des sous-types:', err);
      setError("Impossible de charger les sous-types pour ce type. Détails: " + (err.response?.data?.detail || err.message));
    }
  };

  // Load resource types on mount
  useEffect(() => {
    fetchResourceTypes();
  }, []);

  // Load subtypes when type changes
  useEffect(() => {
    if (formData.resource_type_id) {
      fetchSubTypes(formData.resource_type_id);
    }
  }, [formData.resource_type_id]);

  // Handler for input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'resource_type_id') {
      console.log('useResourceFormState - Selected Type ID in handleInputChange:', value);
      setFormData(prev => ({ ...prev, resource_sub_type_id: '' }));
      fetchSubTypes(value);
    }
  };

  return {
    // Core state
    formData,
    setFormData,

    // Form states
    error,
    setError,
    success,
    setSuccess,
    submitting,
    setSubmitting,

    // Resource types
    resourceTypes,
    resourceSubTypes,
    loadingTypes,
    selectedType,
    selectedSubType,

    // Selection states
    allStudyObjects,
    selectedStudyObjects,
    setSelectedStudyObjects,
    allOeuvres,
    selectedOeuvres,
    setSelectedOeuvres,

    // Upload config
    uploadConfig,
    MAX_UPLOAD_SIZE_MB,
    MAX_FILE_SIZE,
    ALLOWED_FILE_TYPES,
    ALLOWED_FILE_TYPES_LABEL,

    // Handlers
    handleInputChange,
    fetchSubTypes
  };
};