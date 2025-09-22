import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { v4 as uuidv4 } from 'uuid';
import resourceTypeService from '../../services/resourceTypeService';
import resourceService from '../../services/resourceService';
import studyObjectService from '../../services/studyObjectService';
import oeuvreService from '../../services/oeuvreService';
import configService from '../../services/configService';
import { API_BASE_URL } from '../../services/api';
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
  
  // --- Core State ---
  const [formData, setFormData] = useState({
    title: '',
    resource_type_id: '',
    resource_sub_type_id: '',
    session_ids: session ? [session.id] : []
  });

  // --- Handlers ---
  const handleLaunchActivity = useCallback(async () => {
    try {
      console.log('[LAUNCH] start for resource', initialData?.id, {
        initial_runtime_html_url: initialData?.runtime_html_url,
        initial_runtime_html_path: initialData?.runtime_html_path,
        initial_html_url: initialData?.html_url,
        initial_html_content_url: initialData?.html_content_url,
        initial_file_path: initialData?.file_path,
        initial_url: initialData?.url,
      });
      // 1) Prefer runtime_html_url (server-computed URL) if already présent
      let runtimeUrlFromApi = initialData?.runtime_html_url || '';
      // 1bis) Sinon, runtime_html_path
      let runtimePath = initialData?.runtime_html_path;
      let latest = null;

      // 2) If missing, refetch latest resource to get generated runtime
      if (!runtimePath && initialData?.id) {
        try {
          latest = await resourceService.getById(initialData.id);
          console.log('[LAUNCH] latest fetched', latest?.id, {
            runtime_html_url: latest?.runtime_html_url,
            runtime_html_path: latest?.runtime_html_path,
            html_url: latest?.html_url,
            html_content_url: latest?.html_content_url,
            file_path: latest?.file_path,
            url: latest?.url,
          });
          runtimeUrlFromApi = latest?.runtime_html_url || runtimeUrlFromApi;
          runtimePath = latest?.runtime_html_path || runtimePath;
        } catch (e) {
          console.warn('[ResourceForm] Impossible de recharger la ressource pour récupérer runtime_html_path', e);
        }
      }

      // 2bis) Si runtime_html_url est disponible, ouvrir directement
      if (runtimeUrlFromApi) {
        const cacheBuster = Date.now();
        const base = (API_BASE_URL || '').replace(/\/api\/?$/, '');
        const norm = String(runtimeUrlFromApi).replace(/\\/g, '/');
        const fullUrl = norm.startsWith('http') ? norm : `${base}${norm.startsWith('/') ? norm : `/${norm}`}`;
        const withBuster = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}_t=${cacheBuster}`;
        window.open(withBuster, '_blank');
        return;
      }

      // 3) Fallbacks: try html_url/html_content_url, then .html file_path/url
      const tryOpenUrl = (raw) => {
        if (!raw) return false;
        const cacheBuster = Date.now();
        const base = (API_BASE_URL || '').replace(/\/api\/?$/, '');
        const full = raw.startsWith('http') ? raw : `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
        const withBuster = `${full}${full.includes('?') ? '&' : '?'}_t=${cacheBuster}`;
        window.open(withBuster, '_blank');
        return true;
      };

      if (!runtimePath) {
        // Prefer latest html links if available
        const htmlFromLatest = latest?.html_url || latest?.html_content_url;
        const htmlFromInitial = initialData?.html_url || initialData?.html_content_url;
        console.log('[LAUNCH] trying html links', { htmlFromLatest, htmlFromInitial });
        if (tryOpenUrl(htmlFromLatest) || tryOpenUrl(htmlFromInitial)) return;

        const fp = latest?.file_path || initialData?.file_path || '';
        const u = latest?.url || initialData?.url || '';
        const looksHtml = (s) => typeof s === 'string' && s.toLowerCase().trim().endsWith('.html');
        console.log('[LAUNCH] trying html-like paths', { fp, u, looksHtml_fp: looksHtml(fp), looksHtml_u: looksHtml(u) });
        if (looksHtml(fp)) {
          const rel = fp.replace(/^\//, '');
          const cacheBuster = Date.now();
          window.open(`${window.location.origin}/media/uploads/${rel}?_t=${cacheBuster}`, '_blank');
          return;
        }
        if (looksHtml(u)) {
          tryOpenUrl(u);
          return;
        }
      }

      if (runtimePath) {
        const cacheBuster = Date.now();
        const base = (API_BASE_URL || '').replace(/\/api\/?$/, '');
        const norm = String(runtimePath).replace(/\\/g, '/');
        let fullUrl;
        if (norm.startsWith('http')) {
          fullUrl = norm;
        } else if (norm.startsWith('/media/uploads/')) {
          fullUrl = `${base}${norm}`;
        } else if (norm.startsWith('uploads/')) {
          fullUrl = `${base}/media/uploads/${norm}`;
        } else {
          // generic fallback: treat as relative under /media/uploads
          const rel = norm.replace(/^\//, '');
          fullUrl = `${base}/media/uploads/${rel}`;
        }
        const runtimeUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}_t=${cacheBuster}`;
        window.open(runtimeUrl, '_blank');
      } else {
        // Dernier recours: ouvrir la page de consultation qui sait lancer l'activité
        if (initialData?.id) {
          const viewUrl = `${window.location.origin}/resources/view/${initialData.id}`;
          console.log('[LAUNCH] final fallback to view page', viewUrl);
          window.open(viewUrl, '_blank');
        } else {
          alert("L'activité n'est pas encore disponible. Veuillez d'abord sauvegarder le contenu.");
        }
      }
    } catch (err) {
      console.error('[ResourceForm] Erreur lors du lancement de l\'activité:', err);
      alert("Impossible de lancer l'activité pour le moment.");
    }
  }, [initialData]);
  const [sourceType, setSourceType] = useState('ai');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  
  // --- HTML Editor States ---
  const [showAiChat, setShowAiChat] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [tempHtmlContent, setTempHtmlContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [htmlCacheBuster, setHtmlCacheBuster] = useState(Date.now());
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);
  const [lastLoadedCacheBuster, setLastLoadedCacheBuster] = useState(Date.now());
  const [pendingEditMode, setPendingEditMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  // --- Form States ---
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [resourceSubTypes, setResourceSubTypes] = useState([]);
  const [uploadConfig, setUploadConfig] = useState({
    max_upload_size_mb: 10,
    max_upload_size_bytes: 10 * 1024 * 1024,
    allowed_mime_types: [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain', 'audio/mpeg', 'video/mp4'
    ]
  });

  // --- Selection States ---
  const [allStudyObjects, setAllStudyObjects] = useState([]);
  const [selectedStudyObjects, setSelectedStudyObjects] = useState([]);
  const [allOeuvres, setAllOeuvres] = useState([]);
  const [selectedOeuvres, setSelectedOeuvres] = useState([]);

  // --- Computed Values ---
  const MAX_UPLOAD_SIZE_MB = uploadConfig.max_upload_size_mb;
  const MAX_FILE_SIZE = uploadConfig.max_upload_size_bytes;
  const ALLOWED_FILE_TYPES = (allowedMimeTypesOverride && Array.isArray(allowedMimeTypesOverride) && allowedMimeTypesOverride.length > 0)
    ? allowedMimeTypesOverride
    : (uploadConfig.allowed_mime_types || []);
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
  const subtypeKey = ((selectedSubType?.key) || (initialData?.sub_type?.key) || '').toLowerCase();
  const isDynamicActivity = useMemo(() => {
    // Une ressource est considérée comme dynamique si elle a des indicateurs techniques :
    // 1. runtime_html_path : fichier HTML généré dynamiquement
    // 2. data_json : données structurées pour génération dynamique
    // 3. runtime_html_url : URL vers un contenu généré dynamiquement
    
    const hasRuntimePath = Boolean(initialData?.runtime_html_path);
    const hasDataJson = Boolean(initialData?.data_json);
    const hasRuntimeUrl = Boolean(initialData?.runtime_html_url);
    
    const isDynamic = hasRuntimePath || hasDataJson || hasRuntimeUrl;
    
    console.log('[DEBUG ResourceForm] isDynamicActivity (technique):', {
      resourceId: initialData?.id,
      hasRuntimePath,
      hasDataJson, 
      hasRuntimeUrl,
      runtime_html_path: initialData?.runtime_html_path,
      isDynamic
    });
    
    return isDynamic;
  }, [initialData]);
  
  const hasSelectedType = Boolean(selectedType) || Boolean(hideTypeSelection && forcedType && forcedType.typeId);
  const hasSelectedSubType = Boolean(selectedSubType) || Boolean(hideTypeSelection && forcedType && forcedType.subtypeId);
  
  const isCreateMode = !isEdit;
  const hasForcedSubtype = Boolean(forcedType && forcedType.subtypeId);
  const hasFormSubtype = Boolean(formData.resource_sub_type_id && String(formData.resource_sub_type_id).trim() !== '');
  const mustHaveSubtype = isCreateMode;
  const missingSubtype = mustHaveSubtype && !(hasFormSubtype || hasForcedSubtype);
  
  const showAIGenerationForm = !isEdit && sourceType === 'ai' && hasSelectedType && hasSelectedSubType;
  
  // Show HTML editor when in edit mode, but not for Champlex et Champlex2 (both use structured editors)
  const showHtmlEditor = isEdit && !['champlex', 'champlex2'].includes(subtypeKey);

  // Debug logging for showHtmlEditor conditions
  console.log('[DEBUG ResourceForm] showHtmlEditor conditions:', {
    isEdit,
    hasHtmlContent: Boolean(htmlContent && htmlContent.trim()),
    htmlContentLength: htmlContent ? htmlContent.length : 0,
    hasHtmlUrl: Boolean(initialData?.html_url),
    hasHtmlContentUrl: Boolean(initialData?.html_content_url),
    hasHtmlFilePath: Boolean((initialData?.file_path || '').endsWith('.html')),
    hasHtmlUrlPath: Boolean((initialData?.url || '').endsWith('.html')),
    filePath: initialData?.file_path,
    url: initialData?.url,
    showHtmlEditor
  });

  // --- Effects ---
  
  // Initialize with forced type if provided
  useEffect(() => {
    if (isEdit) {
      console.log('[DEBUG ResourceForm] initialData transmis au formulaire :', initialData);
    }
    if (forcedType && forcedType.typeId) {
      console.log('[DEBUG ResourceForm] Type forcé détecté:', forcedType);
      setFormData(prev => ({
        ...prev,
        resource_type_id: String(forcedType.typeId),
        resource_sub_type_id: forcedType.subtypeId ? String(forcedType.subtypeId) : ''
      }));
    }
  }, [isEdit, initialData, forcedType]);

  // Apply initial source type
  useEffect(() => {
    if (initialSourceType && sourceType !== initialSourceType) {
      setSourceType(initialSourceType);
    }
  }, [initialSourceType]);

  // Initialize form with existing data
  useEffect(() => {
    if (initialData && resourceTypes.length > 0) {
      console.log('[DEBUG ResourceForm] initialData avant traitement:', initialData);
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
      
      if (initialData.source_type) setSourceType(initialData.source_type);
      
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
        console.warn("[ResourceForm] Impossible de charger la config d'upload, utilisation des valeurs par défaut.", err);
      }
    })();
    return () => { ignore = true; };
  }, []);

  // HTML content loading effect
  useEffect(() => {
    console.log('[DEBUG] useEffect HTML - Démarrage avec conditions:', {
      isEditingMode, isLoadingHtml, htmlCacheBuster, lastLoadedCacheBuster,
      hasInitialData: !!initialData,
      hasHtmlPath: !!(initialData?.html_url || initialData?.html_content_url || 
                     (initialData?.file_path || '').endsWith('.html') || 
                     (initialData?.url || '').endsWith('.html'))
    });
    
    if (isEditingMode || isLoadingHtml || htmlCacheBuster === lastLoadedCacheBuster || !initialData) {
      console.log('[DEBUG] Chargement HTML bloqué');
      return;
    }
    
    if (initialData.html_url || initialData.html_content_url ||
        (initialData.file_path || '').endsWith('.html') ||
        (initialData.url || '').endsWith('.html')) {
      console.log('[DEBUG] Démarrage chargement HTML avec cache buster:', htmlCacheBuster);
      setIsLoadingHtml(true);
      setLastLoadedCacheBuster(htmlCacheBuster);
      
      const relativeUrlRaw = initialData.html_url || initialData.html_content_url || 
                             initialData.file_path || initialData.url;
      const relativeUrl = (relativeUrlRaw || '').replace(/\\/g, '/');
      let fullUrl;
      
      if (relativeUrl.startsWith('http')) {
        fullUrl = relativeUrl;
      } else {
        let base = API_BASE_URL || '';
        base = base.replace(/\/api\/?$/, '');
        if (relativeUrl.startsWith('uploads/')) {
          fullUrl = `${base}/media/uploads/${relativeUrl}`;
        } else {
          fullUrl = `${base}${relativeUrl}`;
        }
      }
      
      const separator = fullUrl.includes('?') ? '&' : '?';
      const urlWithCacheBuster = `${fullUrl}${separator}_t=${htmlCacheBuster}`;
      
      console.log('[DEBUG] Chargement HTML avec URL:', urlWithCacheBuster);
      
      fetch(urlWithCacheBuster, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      })
        .then(res => res.text())
        .then(content => {
          console.log('[DEBUG] Contenu HTML chargé avec succès, longueur:', content.length);
          setHtmlContent(content);
        })
        .catch(err => {
          console.error('[DEBUG] Erreur lors du chargement du contenu HTML:', err);
          setHtmlContent('');
        })
        .finally(() => {
          console.log('[DEBUG] Fin de chargement HTML');
          setIsLoadingHtml(false);
        });
    }
  }, [initialData, htmlCacheBuster, isEditingMode, lastLoadedCacheBuster]);

  // Watch for HTML content changes to enter edit mode
  useEffect(() => {
    if (pendingEditMode && htmlContent && htmlContent.trim()) {
      console.log('[DEBUG] htmlContent détecté, passage en mode édition avec longueur:', htmlContent.length);
      setPendingEditMode(false);
      setIsEditingMode(true);
      setTempHtmlContent(htmlContent);
      setShowAiChat(false);
      handleSidebarClose();
    }
  }, [htmlContent, pendingEditMode, handleSidebarClose]);

  // Debug logging for tempHtmlContent changes
  useEffect(() => {
    console.log('[DEBUG] tempHtmlContent changed:', {
      hasContent: Boolean(tempHtmlContent),
      length: tempHtmlContent ? tempHtmlContent.length : 0,
      preview: tempHtmlContent ? tempHtmlContent.substring(0, 100) + '...' : 'vide'
    });
  }, [tempHtmlContent]);

  // --- Data Loading Functions ---
  
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

  const fetchSubTypes = useCallback(async (typeId) => {
    console.log('ResourceForm - Fetching subtypes for Type ID:', typeId);
    if (!typeId) {
      setResourceSubTypes([]);
      setFormData(prev => ({ ...prev, resource_sub_type_id: '' }));
      return;
    }
    try {
      const subTypes = await resourceTypeService.getSubtypesByType(typeId);
      console.log('ResourceForm - Subtypes received from API:', subTypes);
      setResourceSubTypes(subTypes);
    } catch (err) {
      console.error('Erreur lors du chargement des sous-types:', err);
      setError("Impossible de charger les sous-types pour ce type. Détails: " + (err.response?.data?.detail || err.message));
    }
  }, []);

  // Load resource types on mount
  useEffect(() => {
    fetchResourceTypes();
  }, [fetchResourceTypes]);

  // Load subtypes when type changes
  useEffect(() => {
    if (formData.resource_type_id) {
      fetchSubTypes(formData.resource_type_id);
    }
  }, [formData.resource_type_id, fetchSubTypes]);

  // ---------------- Champlex2 JSON-first editor state ----------------
  const [ch2Champ, setCh2Champ] = useState('');
  const [ch2TextSpec, setCh2TextSpec] = useState('');
  useEffect(() => {
    if ((subtypeKey === 'champlex2') && initialData) {
      // Préremplir depuis data_json si dispo
      const dj = initialData.data_json || {};
      const champ = (dj.champ || '').trim();
      const mots = Array.isArray(dj.mots) ? dj.mots : [];
      const sol = Array.isArray(dj.solution) ? dj.solution : [];
      if (champ) setCh2Champ(champ);
      if (mots.length) {
        const lines = mots.map((m, i) => `${m}\t${sol[i] ? 1 : 0}`);
        setCh2TextSpec(lines.join('\n'));
      } else if (!ch2TextSpec) {
        // Exemple par défaut
        setCh2TextSpec('frisson\t1\namour\t0\ntrembler\t1');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtypeKey, initialData?.id]);

  const buildChamplex2Json = () => {
    const lines = (ch2TextSpec || '').split(/\r?\n/);
    const mots = [];
    const solution = [];
    for (const raw of lines) {
      const l = (raw || '').trim();
      if (!l) continue;
      const parts = l.split(/[;|,\t]/);
      const mot = (parts[0] || '').trim();
      const valRaw = ((parts[1] || '').trim().toLowerCase());
      if (!mot) continue;
      const isIn = (valRaw === '1' || valRaw === 'oui' || valRaw === 'true' || valRaw === 'in');
      mots.push(mot);
      solution.push(isIn);
    }
    if (!mots.length) throw new Error('Aucun mot valide détecté dans la spécification champlex2.');
    return {
      champ: (ch2Champ || '').trim(),
      mots,
      solution,
    };
  };

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

  // --- Event Handlers ---
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'resource_type_id') {
      console.log('ResourceForm - Selected Type ID in handleInputChange:', value);
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

  const handleEditContent = () => {
    if (!isEditingMode) {
      console.log('[DEBUG] handleEditContent - htmlContent actuel:', htmlContent ? htmlContent.length : 'vide');
      if (htmlContent && htmlContent.trim()) {
        console.log('[DEBUG] handleEditContent - contenu déjà disponible, passage direct en mode édition');
        setIsEditingMode(true);
        setTempHtmlContent(htmlContent);
        console.log('[DEBUG] handleEditContent - tempHtmlContent initialisé avec:', {
          length: htmlContent.length,
          preview: htmlContent.substring(0, 200) + '...'
        });
        setShowAiChat(false);
        handleSidebarClose();
      } else {
        console.log('[DEBUG] handleEditContent - forçage du rechargement HTML et attente du contenu');
        setPendingEditMode(true);
        setHtmlCacheBuster(Date.now());
      }
    }
  };

  const handleActivateAI = () => {
    setShowAiChat(true);
  };

  const handleSaveHtmlContent = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      if (isEdit && resourceId) {
        const dataToSend = new FormData();
        dataToSend.append('html_content', tempHtmlContent);
        await resourceService.update(resourceId, dataToSend);
        setSuccess('Contenu HTML sauvegardé avec succès!');
        console.log('[DEBUG] Sauvegarde réussie');
      }
      
      setHtmlContent(tempHtmlContent);
      setIsEditingMode(false);
      setShowAiChat(false);
      setPendingEditMode(false);
      
      setTimeout(() => {
        setHtmlCacheBuster(Date.now());
      }, 100);
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du contenu HTML:', error);
      const displayError = formatError(error?.response?.data?.detail ?? error?.response?.data ?? error?.message ?? 'Erreur lors de la sauvegarde du contenu HTML');
      setError(displayError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEditing = () => {
    setIsEditingMode(false);
    setShowAiChat(false);
    setPendingEditMode(false);
    setTempHtmlContent(htmlContent);
  };

  // Handle Save As HTML content - creates a new resource with the same characteristics
  const handleSaveAsHtmlContent = async (newTitle) => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      if (!initialData || !resourceId) {
        throw new Error('Données de ressource manquantes pour la duplication');
      }

      // Enhanced debug logging for HTML content
      console.log('[DEBUG] Save As - tempHtmlContent details:', {
        hasContent: Boolean(tempHtmlContent),
        contentLength: tempHtmlContent ? tempHtmlContent.length : 0,
        contentPreview: tempHtmlContent ? tempHtmlContent.substring(0, 200) + '...' : 'vide',
        contentType: typeof tempHtmlContent
      });

      // Create new resource data based on current resource
      const newResourceData = new FormData();
      newResourceData.append('title', newTitle);
      
      // Copy all characteristics from the original resource
      if (initialData.description) {
        newResourceData.append('description', initialData.description);
      }
      if (initialData.type_id) {
        newResourceData.append('type_id', initialData.type_id);
      }
      if (initialData.sub_type_id) {
        newResourceData.append('sub_type_id', initialData.sub_type_id);
      }
      // Set source_type to 'file' since we're sending HTML content as a file
      newResourceData.append('source_type', 'file');
      
      // Add session IDs
      if (Array.isArray(initialData.session_ids)) {
        newResourceData.append('session_ids_json', JSON.stringify(initialData.session_ids));
      }
      
      // Add objective IDs if they exist
      if (Array.isArray(initialData.objective_ids)) {
        newResourceData.append('objective_ids_json', JSON.stringify(initialData.objective_ids));
      }
      
      // Add oeuvre IDs if they exist
      if (Array.isArray(selectedOeuvres) && selectedOeuvres.length > 0) {
        const oeuvreIds = selectedOeuvres.map(o => Number(o.id)).filter(id => !Number.isNaN(id));
        newResourceData.append('oeuvre_ids_json', JSON.stringify(oeuvreIds));
      }
      
      // Create HTML file from tempHtmlContent and send as file upload
      if (tempHtmlContent && tempHtmlContent.trim()) {
        // Generate obfuscated filename using UUID v4 hex (same algorithm as backend)
        const obfuscatedFilename = `${uuidv4().replace(/-/g, '')}.html`;
        
        // Create a Blob from the HTML content with text/plain MIME type (allowed by backend)
        const htmlBlob = new Blob([tempHtmlContent], { type: 'text/plain' });
        // Create a File object with obfuscated name
        const htmlFile = new File([htmlBlob], obfuscatedFilename, {
          type: 'text/plain'
        });
        newResourceData.append('file', htmlFile);
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
      // This overrides any onSuccess callback or navigation settings
      console.log('[DEBUG] Save As - Force navigation to new resource edit page');
      console.log('[DEBUG] Save As - Current location:', window.location.href);
      console.log('[DEBUG] Save As - Target URL:', `/resources/edit/${newResource.id}`);
      
      // Use setTimeout to ensure navigation happens after all React state updates
      setTimeout(() => {
        console.log('[DEBUG] Save As - Executing delayed navigation to new resource:', newResource.id);
        console.log('[DEBUG] Save As - About to navigate with React Router');
        console.log('[DEBUG] Save As - Current URL before navigation:', window.location.href);
        console.log('[DEBUG] Save As - Attempting navigation to:', `/resources/edit/${newResource.id}`);
        
        // Use React Router navigation with replace to avoid history stack issues
        navigate(`/resources/edit/${newResource.id}`, { replace: true });
        
        // Log after navigation attempt
        setTimeout(() => {
          console.log('[DEBUG] Save As - URL after navigation attempt:', window.location.href);
          console.log('[DEBUG] Save As - Navigation should be complete');
        }, 100);
      }, 100);
      
      // Note: We don't call onSuccess callback for Save As operations
      // as we want to navigate directly to the new resource
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde sous:', error);
      const displayError = formatError(error?.response?.data?.detail ?? error?.response?.data ?? error?.message ?? 'Erreur lors de la sauvegarde sous');
      setError(displayError);
      throw error; // Re-throw to let the component handle loading state
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const isCreateModeLocal = !isEdit;
      const hasForcedSubtypeLocal = Boolean(forcedType && forcedType.subtypeId);
      const hasFormSubtypeLocal = Boolean(formData.resource_sub_type_id && String(formData.resource_sub_type_id).trim() !== '');
      if (isCreateModeLocal && !(hasForcedSubtypeLocal || hasFormSubtypeLocal)) {
        setError('Veuillez sélectionner un sous-type avant de créer.');
        setSubmitting(false);
        return;
      }
    } catch (_) {}

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

    if (isEdit && htmlContent) {
      dataToSend.append('html_content', htmlContent);
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

      if (isDialog && onClose) {
        onClose();
      }

      if (!disableNavigation && !isDialog) {
        navigate('/resources');
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la ressource:', err);
      const raw = err?.response?.data?.detail ?? err?.response?.data ?? err?.message ?? 'Une erreur est survenue lors de la sauvegarde.';
      const displayError = formatError(raw);
      setError(displayError);
      const lower = (displayError || '').toLowerCase();
      if (lower.includes('fichier') || lower.includes('file')) {
        setFileError(displayError);
      }
    } finally {
      setSubmitting(false);
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
        handleSaveHtmlContent={handleSaveHtmlContent}
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
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Grid container spacing={3}>
        <ResourceBasicFields
          formData={formData}
          handleInputChange={handleInputChange}
          submitting={submitting}
        />


        {/* Section "Contenu HTML" pour les exercices dynamiques (Champlex2) */}
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
                {/* Bouton "Lancer l'activité" - affiché pour toutes les ressources dynamiques */}
                {isDynamicActivity && (
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
                )}
                
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
          handleSaveHtmlContent={handleSaveHtmlContent}
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
