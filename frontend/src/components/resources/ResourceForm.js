import React, { useState, useEffect, useCallback } from 'react'; 
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Alert,
  CircularProgress,
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  FormLabel,
  Autocomplete,
  Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit'; 
import { useNavigate } from 'react-router-dom';
import resourceTypeService from '../../services/resourceTypeService';
import resourceService from '../../services/resourceService'; 
import studyObjectService from '../../services/studyObjectService';
import oeuvreService from '../../services/oeuvreService';
import configService from '../../services/configService';
import { API_BASE_URL } from '../../services/api';
import DynamicAIForm from '../DynamicAIForm/index';  
import TinyHtmlEditor from '../editors/TinyHtmlEditor';
import HtmlChatBot from '../htmlChat/HtmlChatBot';
import { useLayout } from '../../contexts/LayoutContext';

/**
 * Composant de formulaire réutilisable pour la création et l'édition de ressources
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
  // Nouvelles options pour masquer certains champs
  hideTypeSelection = false,
  hideStudyObjectSelection = false,
  forcedType = null,
  disableNavigation = false,
  initialSourceType = 'ai',
  lockTypeSelection = false,
  allowedMimeTypesOverride = null,
}) => {
  // --- Utiliser useNavigate pour la redirection ---
  const navigate = useNavigate(); 
  
  // --- Accès au contexte layout pour contrôler la sidenav ---
  const { handleSidebarClose } = useLayout();
  
  // --- États --- 
  const [formData, setFormData] = useState({
    title: '',
    resource_type_id: '',
    resource_sub_type_id: '',
    session_ids: session ? [session.id] : []
  });
  const [sourceType, setSourceType] = useState('ai'); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  
  // États pour contrôler l'affichage du chat IA et le mode édition
  const [showAiChat, setShowAiChat] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [tempHtmlContent, setTempHtmlContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [htmlCacheBuster, setHtmlCacheBuster] = useState(Date.now());
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);
  const [lastLoadedCacheBuster, setLastLoadedCacheBuster] = useState(Date.now());
  const [pendingEditMode, setPendingEditMode] = useState(false); // Flag pour indiquer qu'on attend le contenu HTML

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
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'audio/mpeg',
      'video/mp4',
    ],
  });
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

  // Contenu HTML pour l'éditeur
  const [htmlContent, setHtmlContent] = useState('');

  const [allStudyObjects, setAllStudyObjects] = useState([]);
  const [selectedStudyObjects, setSelectedStudyObjects] = useState([]);
  const [allOeuvres, setAllOeuvres] = useState([]);
  const [selectedOeuvres, setSelectedOeuvres] = useState([]);

  // --- Effets --- 

  // Debug initialData
  useEffect(() => {
    if (isEdit) {
      console.log('[DEBUG ResourceForm] initialData transmis au formulaire :', initialData);
    }

    // Si un type forcé est fourni, l'appliquer (même sans sous-type)
    if (forcedType && forcedType.typeId) {
      console.log('[DEBUG ResourceForm] Type forcé détecté:', forcedType);
      setFormData(prev => ({
        ...prev,
        resource_type_id: String(forcedType.typeId),
        resource_sub_type_id: forcedType.subtypeId ? String(forcedType.subtypeId) : ''
      }));
    }
  }, [isEdit, initialData, forcedType]);

  // Appliquer la source initiale (ai/file/url) fournie par le parent
  useEffect(() => {
    if (initialSourceType && sourceType !== initialSourceType) {
      setSourceType(initialSourceType);
    }
  }, [initialSourceType]);

  // Initialisation du formulaire avec les données existantes
  useEffect(() => {
    // Vérifier que initialData existe et que les types sont chargés
    if (initialData && resourceTypes.length > 0) {
        console.log('[DEBUG ResourceForm] initialData avant traitement:', initialData); // Log pour debug
        const initialTypeId = initialData.type_id ? String(initialData.type_id) : '';
        const initialSubTypeId = initialData.sub_type_id ? String(initialData.sub_type_id) : '';

        // Fusion prudente: ne pas écraser un type déjà défini (ex: via forcedType)
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
        // Ne pas écraser la source en mode création: n'appliquer que si une source explicite existe (cas édition)
        if (initialData.source_type) {
          setSourceType(initialData.source_type);
        }
        if (Array.isArray(initialData.study_objects)) {
          setSelectedStudyObjects(initialData.study_objects);
        } else if (Array.isArray(initialData.study_object_ids) && Array.isArray(allStudyObjects) && allStudyObjects.length > 0) {
          // fallback si study_objects absent mais study_object_ids présent
          setSelectedStudyObjects(allStudyObjects.filter(obj => initialData.study_object_ids.includes(obj.id)));
        }
        if (Array.isArray(initialData.oeuvres)) {
          setSelectedOeuvres(initialData.oeuvres);
        } else if (Array.isArray(initialData.oeuvre_ids) && Array.isArray(allOeuvres) && allOeuvres.length > 0) {
          // fallback si oeuvres absent mais oeuvre_ids présent
          setSelectedOeuvres(allOeuvres.filter(o => initialData.oeuvre_ids.includes(o.id)));
        }
        // Charger les sous-types correspondants si un type est sélectionné
        if (initialTypeId) {
            fetchSubTypes(initialTypeId);
        }
    } else if (!isEdit && session) {
        // Cas création simple avec session pré-remplie
        setFormData(prev => ({ ...prev, session_ids: [session.id] }));
    }
  }, [initialData, resourceTypes, session, isEdit, allStudyObjects, allOeuvres]);

  // Charger la configuration d'upload depuis le backend
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

  // Charger le contenu HTML existant le cas échéant
  useEffect(() => {
    console.log('[DEBUG] useEffect HTML - Démarrage avec conditions:', {
      isEditingMode,
      isLoadingHtml,
      htmlCacheBuster,
      lastLoadedCacheBuster,
      hasInitialData: !!initialData,
      hasHtmlPath: !!(initialData?.html_url || initialData?.html_content_url || (initialData?.file_path || '').endsWith('.html') || (initialData?.url || '').endsWith('.html'))
    });
    
    // Ne pas recharger le HTML si on est en train d'éditer ou si déjà en cours de chargement
    if (isEditingMode || isLoadingHtml) {
      console.log('[DEBUG] Chargement HTML bloqué - isEditingMode:', isEditingMode, 'isLoadingHtml:', isLoadingHtml);
      return;
    }
    
    // Ne pas recharger si le cache buster n'a pas changé
    if (htmlCacheBuster === lastLoadedCacheBuster) {
      console.log('[DEBUG] Chargement HTML bloqué - cache buster identique:', htmlCacheBuster);
      return;
    }
    
    if (!initialData) {
      console.log('[DEBUG] Pas de initialData, pas de chargement HTML');
      return;
    }
    
    if (
      initialData.html_url ||
      initialData.html_content_url ||
      (initialData.file_path || '').endsWith('.html') ||
      (initialData.url || '').endsWith('.html')
    ) {
      console.log('[DEBUG] Démarrage chargement HTML avec cache buster:', htmlCacheBuster);
      setIsLoadingHtml(true);
      setLastLoadedCacheBuster(htmlCacheBuster); // Marquer ce cache buster comme traité
      
      const relativeUrlRaw = initialData.html_url || initialData.html_content_url || initialData.file_path || initialData.url;
      // Remplacer les backslashes éventuels par des slashs pour une URL valide
      const relativeUrl = (relativeUrlRaw || '').replace(/\\/g, '/');
      let fullUrl;
      if (relativeUrl.startsWith('http')) {
        fullUrl = relativeUrl;
      } else {
        let base = API_BASE_URL || '';
        // Si base se termine par /api ou /api/, on le retire pour accéder aux fichiers statiques
        base = base.replace(/\/api\/?$/, '');
        // Si le chemin commence par "uploads/", préfixer avec /media/
        if (relativeUrl.startsWith('uploads/')) {
          // Cas backend: MEDIA_URL = /media/uploads/ => besoin de /media/uploads/<relative>
          fullUrl = `${base}/media/uploads/${relativeUrl}`;
        } else {
          fullUrl = `${base}${relativeUrl}`;
        }
      }
      
      // Ajouter un paramètre cache-buster pour éviter la mise en cache
      const separator = fullUrl.includes('?') ? '&' : '?';
      const urlWithCacheBuster = `${fullUrl}${separator}_t=${htmlCacheBuster}`;
      
      console.log('[DEBUG] Chargement HTML avec URL:', urlWithCacheBuster);
      
      fetch(urlWithCacheBuster, {
        cache: 'no-cache', // Force le rechargement
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
        .then(res => res.text())
        .then(content => {
          console.log('[DEBUG] Contenu HTML chargé avec succès, longueur:', content.length);
          console.log('[DEBUG] Aperçu du contenu (100 premiers caractères):', content.substring(0, 100));
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
    } else {
      console.log('[DEBUG] Aucune URL HTML détectée dans initialData:', {
        html_url: initialData?.html_url,
        html_content_url: initialData?.html_content_url,
        file_path: initialData?.file_path,
        url: initialData?.url,
        file_path_ends_with_html: (initialData?.file_path || '').endsWith('.html'),
        url_ends_with_html: (initialData?.url || '').endsWith('.html')
      });
    }
  }, [initialData, htmlCacheBuster, isEditingMode, lastLoadedCacheBuster]); // Retirer isLoadingHtml des dépendances pour éviter la boucle

  // Surveiller les changements de htmlContent pour entrer en mode édition automatiquement
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

  // Charger les types
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

  // Charger les sous-types
  const fetchSubTypes = useCallback(async (typeId) => {
    console.log('ResourceForm - Fetching subtypes for Type ID:', typeId); // TRACE
    if (!typeId) {
      setResourceSubTypes([]);
      setFormData(prev => ({ ...prev, resource_sub_type_id: '' })); 
      return;
    }
    try {
      const subTypes = await resourceTypeService.getSubtypesByType(typeId); 
      console.log('ResourceForm - Subtypes received from API:', subTypes); // TRACE
      setResourceSubTypes(subTypes);
      console.log('ResourceForm - Set ResourceSubTypes state with:', subTypes); // TRACE
    } catch (err) {
      console.error('Erreur lors du chargement des sous-types:', err);
      setError("Impossible de charger les sous-types pour ce type. Détails: " + (err.response?.data?.detail || err.message));
    }
  }, []); 

  useEffect(() => {
    // Charger les sous-types si type_id change et est défini
    if (formData.resource_type_id) {
        fetchSubTypes(formData.resource_type_id);
    }
  }, [formData.resource_type_id, fetchSubTypes]);

  // Charger tous les objets d'étude pour l'autocomplete
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

  // Charger les œuvres pour l'autocomplete
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

  // --- Gestionnaires d'événements ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Si le type change, réinitialiser le sous-type et recharger les sous-types
    if (name === 'resource_type_id') {
        console.log('ResourceForm - Selected Type ID in handleInputChange:', value); // TRACE
        setFormData(prev => ({ ...prev, resource_sub_type_id: '' })); 
        fetchSubTypes(value); 
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        // Validation côté client
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
    // Réinitialiser le fichier/erreur si on passe à 'file'
    if (e.target.value === 'file') {
        setSelectedFile(null);
        setFileError('');
    }
  };

  // Gestionnaire pour le bouton "Éditer le contenu"
  const handleEditContent = () => {
    // Forcer le rechargement du contenu HTML avant l'édition (une seule fois)
    if (!isEditingMode) {
      console.log('[DEBUG] handleEditContent - htmlContent actuel:', htmlContent ? htmlContent.length : 'vide');
      console.log('[DEBUG] handleEditContent - initialData:', {
        html_url: initialData?.html_url,
        html_content_url: initialData?.html_content_url,
        file_path: initialData?.file_path,
        url: initialData?.url
      });
      
      // Si le contenu est déjà chargé, utiliser directement
      if (htmlContent && htmlContent.trim()) {
        console.log('[DEBUG] handleEditContent - contenu déjà disponible, passage direct en mode édition');
        setIsEditingMode(true);
        console.log('[DEBUG] handleEditContent - setting tempHtmlContent (direct) avec longueur:', htmlContent.length);
        setTempHtmlContent(htmlContent);
        setShowAiChat(false);
        handleSidebarClose();
      } else {
        console.log('[DEBUG] handleEditContent - forçage du rechargement HTML et attente du contenu');
        // Marquer qu'on attend le contenu pour entrer en mode édition
        setPendingEditMode(true);
        // Déclencher le rechargement du contenu
        setHtmlCacheBuster(Date.now());
      }
    }
  };

  // Gestionnaire pour activer l'IA pendant l'édition
  const handleActivateAI = () => {
    setShowAiChat(true);
  };

  // Gestionnaire pour sauvegarder le contenu HTML modifié
  const handleSaveHtmlContent = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      // Si on est en mode édition, sauvegarder via l'API
      if (isEdit && resourceId) {
        const dataToSend = new FormData();
        dataToSend.append('html_content', tempHtmlContent);
        
        await resourceService.update(resourceId, dataToSend);
        setSuccess('Contenu HTML sauvegardé avec succès!');
        console.log('[DEBUG] Sauvegarde réussie');
      }
      
      // Mettre à jour le contenu HTML principal APRES la sauvegarde
      setHtmlContent(tempHtmlContent);
      
      // Revenir au mode standard
      setIsEditingMode(false);
      setShowAiChat(false);
      setPendingEditMode(false); // Réinitialiser le flag d'attente
      
      // Forcer le rechargement du contenu pour la prochaine fois (seulement après sortie du mode édition)
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

  // Gestionnaire pour annuler l'édition
  const handleCancelEditing = () => {
    setIsEditingMode(false);
    setShowAiChat(false);
    setPendingEditMode(false); // Réinitialiser le flag d'attente
    setTempHtmlContent(htmlContent); // Restaurer le contenu original
  };

  // Helper: normaliser toutes les formes d'erreurs en chaîne exploitable
  const formatError = (val) => {
    try {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) {
        // FastAPI/Pydantic: liste d'objets {type, loc, msg, input}
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

    // Sécurité: exiger un sous-type en mode création (même si le bouton est désactivé, la touche Entrée pourrait tenter une soumission)
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

    // Vérification spécifique si source_type est 'file'
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

    // Préparation des données à envoyer
    const dataToSend = new FormData();

    // Champs de base
    if (formData.title) dataToSend.append('title', formData.title);
    if (formData.description) dataToSend.append('description', formData.description);

    // Mapping des clés vers celles attendues par le backend
    if (formData.resource_type_id) {
      const typeId = Number(formData.resource_type_id);
      if (!Number.isNaN(typeId)) dataToSend.append('type_id', typeId);
    }
    const subTypeId = Number(formData.resource_sub_type_id);
    if (!Number.isNaN(subTypeId)) dataToSend.append('sub_type_id', subTypeId);

    // Source de la ressource (le backend n'accepte que 'file' ou 'ai')
    const backendSourceType = sourceType === 'url' ? 'ai' : sourceType;
    dataToSend.append('source_type', backendSourceType);

    // Sérialisation JSON des listes (conforme au backend)
    const sessionIds = Array.isArray(formData.session_ids)
      ? formData.session_ids.map(id => Number(id)).filter(id => !Number.isNaN(id))
      : [];
    if (isEdit) {
      // En mise à jour: n'envoyer que si défini pour éviter d'écraser par inadvertance
      if (Array.isArray(formData.session_ids)) {
        dataToSend.append('session_ids_json', JSON.stringify(sessionIds));
      }
    } else {
      dataToSend.append('session_ids_json', JSON.stringify(sessionIds));
    }

    // Objectifs (optionnels): si fournis dans formData, les envoyer
    if (Array.isArray(formData.objective_ids)) {
      const objectiveIds = formData.objective_ids
        .map(id => Number(id))
        .filter(id => !Number.isNaN(id));
      dataToSend.append('objective_ids_json', JSON.stringify(objectiveIds));
    }

    // Objets d'étude
    // NOTE: L'association directe des ressources aux objets d'étude est désormais gérée ailleurs.
    // Ne plus envoyer "study_object_ids_json" côté frontend lors de la création/édition.
    // (Sélecteur conservé pour l'UI mais non soumis ici.)

    // Œuvres associées
    const oeuvreIds = Array.isArray(selectedOeuvres)
      ? selectedOeuvres.map(o => Number(o.id)).filter(id => !Number.isNaN(id))
      : [];
    if (isEdit) {
      dataToSend.append('oeuvre_ids_json', JSON.stringify(oeuvreIds));
    } else if (oeuvreIds.length > 0) {
      dataToSend.append('oeuvre_ids_json', JSON.stringify(oeuvreIds));
    }

    // NOTE: Le backend actuel ne supporte pas un champ 'url' pour les ressources.
    // Si une gestion de ressources par lien est souhaitée, prévoir une évolution backend dédiée.

    // Contenu HTML: uniquement pour l'édition des ressources IA existantes
    if (isEdit && htmlContent) {
      dataToSend.append('html_content', htmlContent);
    }

    // Fichier (si nécessaire)
    if (sourceType === 'file' && selectedFile) {
      dataToSend.append('file', selectedFile);
    }

    try {
      let response;

      if (isEdit) {
        // Edition d'une ressource existante
        response = await resourceService.update(resourceId, dataToSend);
        setSuccess('Ressource mise à jour avec succès!');
      } else {
        // Création d'une nouvelle ressource
        response = await resourceService.create(dataToSend);
        setSuccess('Ressource créée avec succès!');
      }

      // Appeler la fonction onSuccess si fournie
      if (onSuccess) {
        // Attendre la complétion du callback (important si navigation/détachements doivent suivre)
        await onSuccess(response);
      }

      // Réinitialiser les champs du formulaire si création
      if (!isEdit) {
        setSourceType('ai');
        setSelectedFile(null);
        setFileError('');
      }

      // Si on est en mode dialogue, fermer le dialogue
      if (isDialog && onClose) {
        onClose();
      }

      // Redirection automatique uniquement si autorisée
      if (!disableNavigation && !isDialog) {
        navigate('/resources');
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la ressource:', err);

      // Traitement des erreurs spécifiques API
      const raw = err?.response?.data?.detail ?? err?.response?.data ?? err?.message ?? 'Une erreur est survenue lors de la sauvegarde.';
      const displayError = formatError(raw);
      setError(displayError);

      // Si l'erreur formatée concerne le fichier
      const lower = (displayError || '').toLowerCase();
      if (lower.includes('fichier') || lower.includes('file')) {
        setFileError(displayError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Clé type & sous-type sélectionnés
  const selectedType = resourceTypes.find(t => String(t.id) === String(formData.resource_type_id));
  const selectedSubType = resourceSubTypes.find(st => String(st.id) === String(formData.resource_sub_type_id));

  // Détermine si les types sont disponibles soit par sélection soit par forçage (exiger des IDs réels)
  const hasSelectedType = Boolean(selectedType) || Boolean(hideTypeSelection && forcedType && forcedType.typeId);
  const hasSelectedSubType = Boolean(selectedSubType) || Boolean(hideTypeSelection && forcedType && forcedType.subtypeId);
  
  // Désactiver la soumission en création si aucun sous-type n'est positionné
  const isCreateMode = !isEdit;
  const hasForcedSubtype = Boolean(forcedType && forcedType.subtypeId);
  const hasFormSubtype = Boolean(formData.resource_sub_type_id && String(formData.resource_sub_type_id).trim() !== '');
  const mustHaveSubtype = isCreateMode; // règle demandée : seulement en création
  const missingSubtype = mustHaveSubtype && !(hasFormSubtype || hasForcedSubtype);
  
  // Afficher le formulaire IA si on est en mode IA et que les types sont définis (soit par sélection, soit par forçage)
  // Afficher le formulaire de génération IA seulement en mode création
  const showAIGenerationForm = !isEdit && sourceType === 'ai' && hasSelectedType && hasSelectedSubType;

  // L'éditeur HTML ne doit apparaître qu'en mode édition ET si un contenu initial HTML existe ou a déjà été chargé/édité
  const showHtmlEditor = isEdit && (
    Boolean(htmlContent && htmlContent.trim()) ||
    Boolean(initialData?.html_url || initialData?.html_content_url || (initialData?.file_path || '').endsWith('.html') || (initialData?.url || '').endsWith('.html'))
  );
  
  // Debug pour aider à comprendre pourquoi le formulaire pourrait ne pas s'afficher
  console.log('[DEBUG ResourceForm] État du formulaire IA:', {
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

  // Boutons d'action partagés
  // En mode création d'une ressource IA, les boutons sont gérés par DynamicAIForm.
  // En mode édition (isEdit), on doit quand même afficher les boutons, même si la source est "ai".
  // En mode édition HTML, les boutons sont gérés dans l'interface d'édition.
  const actionButtons = (!isEdit && sourceType === 'ai') || isEditingMode ? null : (
    <>
      <Button 
        onClick={isDialog ? onClose : () => navigate(-1)} 
        color="secondary" 
        disabled={submitting}
      >
        Annuler
      </Button>
      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        disabled={submitting || missingSubtype}
        onClick={handleSubmit}
      >
        {submitting ? <CircularProgress size={24} /> : (isEdit ? 'Mettre à jour' : 'Créer')}
      </Button>
    </>
  );

  // Construction du contenu du formulaire
  const formContent = (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      {!isEditingMode ? (
        // Mode standard : afficher tous les champs du formulaire
        <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Titre"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            disabled={submitting}
          />
        </Grid>

        {showHtmlEditor && (
          <Grid item xs={12}>
            {!isEditingMode ? (
              // Mode standard : afficher le lien vers le document
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6">Contenu HTML</Typography>
                {htmlContent && (
                  <Link
                    component="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const newWindow = window.open('', '_blank');
                      newWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Aperçu du contenu HTML</title>
                            <meta charset="utf-8">
                          </head>
                          <body>
                            ${htmlContent}
                          </body>
                        </html>
                      `);
                      newWindow.document.close();
                    }}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      textDecoration: 'none',
                      background: 'none',
                      border: 0,
                      cursor: 'pointer',
                      color: 'primary.main'
                    }}
                  >
                    <LinkIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Consulter le contenu
                    <OpenInNewIcon fontSize="small" sx={{ ml: 0.5 }} />
                  </Link>
                )}
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleEditContent}
                  sx={{
                    backgroundColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    }
                  }}
                >
                  Éditer le contenu
                </Button>
              </Box>
            ) : (
              // Mode édition : afficher l'éditeur et les contrôles
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="h6">Édition du contenu HTML</Typography>
                  {!showAiChat && (
                    <Button
                      variant="outlined"
                      startIcon={<PsychologyIcon />}
                      onClick={handleActivateAI}
                      sx={{
                        color: 'primary.main',
                        borderColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                          borderColor: 'primary.dark',
                        }
                      }}
                    >
                      Activer l'IA
                    </Button>
                  )}
                  {showAiChat && (
                    <Button
                      variant="text"
                      startIcon={showAiChat ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      onClick={() => setShowAiChat(!showAiChat)}
                      size="small"
                    >
                      {showAiChat ? 'Masquer' : 'Afficher'} l'assistant IA
                    </Button>
                  )}
                  <Box sx={{ flexGrow: 1 }} />
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveHtmlContent}
                    disabled={submitting}
                    color="success"
                  >
                    {submitting ? <CircularProgress size={24} /> : 'Sauvegarder'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCancelEditing}
                    disabled={submitting}
                  >
                    Annuler
                  </Button>
                </Box>
                
                <Grid container spacing={2}>
                  {/* Éditeur HTML principal */}
                  <Grid item xs={12} md={showAiChat ? 8 : 12}>
                    <TinyHtmlEditor 
                      initialHtml={tempHtmlContent} 
                      onChange={setTempHtmlContent} 
                    />
                  </Grid>
                  
                  {/* Chatbot IA pour assistance - affichage conditionnel */}
                  {showAiChat && (
                    <Grid item xs={12} md={4}>
                      <HtmlChatBot
                        currentHtml={tempHtmlContent}
                        onHtmlChange={setTempHtmlContent}
                        disabled={submitting}
                      />
                    </Grid>
                  )}
                </Grid>
              </>
            )}
          </Grid>
        )}

        {/* Sélecteur des objets d'étude - caché si hideStudyObjectSelection=true */}
        {!hideStudyObjectSelection && (
          <Grid item xs={12}>
            <Autocomplete
              multiple
              id="study-object-autocomplete"
              options={allStudyObjects}
              getOptionLabel={(option) => option.title || ''}
              value={selectedStudyObjects}
              onChange={(_event, newValue) => setSelectedStudyObjects(newValue)}
              filterSelectedOptions
              isOptionEqualToValue={(option, value) => option.id === value.id}
              disabled={submitting}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Objets d'étude"
                  placeholder="Ajouter un objet d'étude"
                  fullWidth
                />
              )}
            />
          </Grid>
        )}

        {/* Sélecteur des œuvres */}
        <Grid item xs={12}>
          <Autocomplete
            multiple
            id="oeuvre-autocomplete"
            options={allOeuvres}
            getOptionLabel={(option) => option.titre || ''}
            value={selectedOeuvres}
            onChange={(_event, newValue) => setSelectedOeuvres(newValue)}
            filterSelectedOptions
            isOptionEqualToValue={(option, value) => option.id === value.id}
            disabled={submitting}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Œuvres"
                placeholder="Ajouter une œuvre"
                fullWidth
              />
            )}
          />
        </Grid>

        {/* Sélecteur Type / Sous-type - caché si hideTypeSelection=true */}
        {!hideTypeSelection ? (
          <>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="type-label">Type</InputLabel>
                <Select
                  labelId="type-label"
                  name="resource_type_id"
                  value={formData.resource_type_id || ''}
                  onChange={handleInputChange}
                  label="Type"
                  disabled={lockTypeSelection || loadingTypes || resourceTypes.length === 0 || submitting}
                >
                  {resourceTypes.map((type) => (
                    <MenuItem key={type.id} value={String(type.id)}>
                      {type.value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="subtype-label">Sous-type</InputLabel>
                <Select
                  labelId="subtype-label"
                  name="resource_sub_type_id"
                  value={formData.resource_sub_type_id || ''}
                  onChange={handleInputChange}
                  label="Sous-type"
                  disabled={formData.resource_type_id === '' || submitting}
                >
                  {resourceSubTypes.map((subType) => (
                    <MenuItem key={subType.id} value={String(subType.id)}>
                      {subType.value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </>
        ) : forcedType && (
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle1">Type de ressource : <strong>{forcedType.typeName || 'Leçon'}</strong></Typography>
              <Typography variant="subtitle1">Sous-type : <strong>{forcedType.subtypeName || 'Résumé de séquence'}</strong></Typography>
            </Box>
          </Grid>
        )}

        {/* Sélecteur Source Type - affiché seulement si disableSourceSelection est false */}
        {!disableSourceSelection && (
          <Grid item xs={12}>
            <FormControl component="fieldset" disabled={submitting}>
              <FormLabel component="legend">Source de la ressource</FormLabel>
              <RadioGroup
                row
                aria-label="source-type"
                name="source_type"
                value={sourceType}
                onChange={handleSourceTypeChange}
              >
                <FormControlLabel value="ai" control={<Radio />} label="Générée par IA" />
                <FormControlLabel value="file" control={<Radio />} label="Fichier" />
                <FormControlLabel value="url" control={<Radio />} label="URL externe" />
              </RadioGroup>
            </FormControl>
          </Grid>
        )}

        {/* Affichage du lien vers le document lié à la ressource en mode édition */}
        {isEdit && initialData?.source_type === 'ai' && initialData?.file_path && (
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <span>
                  Document actuellement lié :{' '}
                  <a
                    href={`${API_BASE_URL}/media/uploads/${initialData.file_path.startsWith('/') ? initialData.file_path.substring(1) : initialData.file_path}`.replace(/\\/g, '/')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ouvrir le document généré
                  </a>
                </span>
              </Box>
              <span style={{fontStyle: 'italic', color: '#888'}}>Ce document est celui actuellement rattaché à la ressource.</span>
            </Alert>
          </Grid>
        )}

        {/* Sélecteur Fichier */}
        {sourceType === 'file' && (
          <Grid item xs={12}>
            <Box sx={{ border: '1px dashed grey', padding: 2, textAlign: 'center' }}>
              <input
                accept={ALLOWED_FILE_TYPES.join(',')}
                style={{ display: 'none' }}
                id="raised-button-file"
                type="file"
                onChange={handleFileChange}
                disabled={submitting}
              />
              <label htmlFor="raised-button-file">
                <Button 
                  variant="outlined" 
                  component="span" 
                  startIcon={<UploadFileIcon />} 
                  disabled={submitting}
                >
                  Choisir un fichier ({ALLOWED_FILE_TYPES_LABEL}) — Max {MAX_UPLOAD_SIZE_MB} Mo
                </Button>
              </label>
              {selectedFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Fichier sélectionné: {selectedFile.name}
                </Typography>
              )}
              {fileError && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {fileError}
                </Typography>
              )}
              {isEdit && initialData?.source_type === 'file' && !selectedFile && initialData.file_name && (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Fichier actuel: {initialData.file_name} (choisir un nouveau fichier pour remplacer)
                </Typography>
              )}
            </Box>
          </Grid>
        )}

        {/* Affichage du formulaire IA */}
        {showAIGenerationForm && (
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Card>
                <CardHeader title="Générateur de ressource basé sur l'IA" />
                <CardContent>
                  {/* Code de débogage avant le rendu du composant */}
                  {console.log('[DEBUG] Clés transmises au DynamicAIForm:', {
                    typeKey: selectedType?.key || (forcedType ? 'LECON' : ''),
                    subtypeKey: selectedSubType?.key || (forcedType ? 'SEQUENCE_SUMMARY' : ''),
                    typeId: selectedType?.id || forcedType?.typeId,
                    subtypeId: selectedSubType?.id || forcedType?.subtypeId
                  })}
                  <DynamicAIForm
                    typeKey={selectedType?.key || (forcedType ? 'LECON' : '')}
                    subtypeKey={selectedSubType?.key || (forcedType ? 'SEQUENCE_SUMMARY' : '')}
                    typeId={selectedType?.id || forcedType?.typeId}
                    subtypeId={selectedSubType?.id || forcedType?.subtypeId}
                    onSubmit={handleSubmit}
                                        onSuccess={(createdResource) => {
                      console.log('[DEBUG] ResourceForm.js -> onSuccess de DynamicAIForm: Callback déclenché.', { createdResource });
                      setSuccess('Ressource générée avec succès!');

                      // D'ABORD, appeler le callback onSuccess principal fourni à ResourceForm
                      // pour permettre des actions comme attachBilan AVANT toute navigation.
                      if (onSuccess) { // 'onSuccess' ici est la prop de ResourceForm
                        console.log('[DEBUG] ResourceForm.js: Appel du onSuccess parent (de SequenceSummaryResourceGenerator).');
                        onSuccess(createdResource);
                      } else {
                        console.warn('[DEBUG] ResourceForm.js: Pas de callback onSuccess parent à appeler.');
                      }
                      
                      // ENSUITE, gérer la navigation conditionnelle
                      if (!disableNavigation && !isEdit && !isDialog) {
                        console.log('[DEBUG] ResourceForm.js: Redirection vers /resources via navigate() (car non désactivée).');
                        navigate('/resources');
                      } else {
                        console.log('[DEBUG] ResourceForm.js: Navigation désactivée.', { disableNavigation, isEdit, isDialog });
                      }
                    }}
                    selectedStudyObjects={selectedStudyObjects}
                    prefilledData={{
                    ...(prefilledAiData || {}),
                    title: formData.title, // Titre saisi dans ResourceForm
                    description: formData.description // Description saisie dans ResourceForm
                  }}
                    readOnlyMode={false} // Toujours autoriser l'édition des champs
                  />
                </CardContent>
              </Card>
            </Box>
          </Grid>
        )}
      </Grid>
      ) : (
        // Mode édition : afficher seulement l'éditeur HTML et les contrôles
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Overlay de chargement pour bloquer les interactions pendant les opérations IA */}
          {aiLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                borderRadius: 1
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  L'IA traite votre demande...
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Veuillez patienter, ne pas modifier le contenu
                </Typography>
              </Box>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">Édition du contenu HTML</Typography>
            {!showAiChat && (
              <Button
                variant="outlined"
                startIcon={<PsychologyIcon />}
                onClick={handleActivateAI}
                sx={{
                  color: 'primary.main',
                  borderColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    borderColor: 'primary.dark',
                  }
                }}
              >
                Activer l'IA
              </Button>
            )}
            {showAiChat && (
              <Button
                variant="text"
                startIcon={showAiChat ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowAiChat(!showAiChat)}
                size="small"
              >
                {showAiChat ? 'Masquer' : 'Afficher'} l'assistant IA
              </Button>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveHtmlContent}
              disabled={submitting}
              color="success"
            >
              {submitting ? <CircularProgress size={24} /> : 'Sauvegarder'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancelEditing}
              disabled={submitting}
            >
              Annuler
            </Button>
          </Box>
          
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Éditeur HTML principal */}
            <Box sx={{ flex: showAiChat ? 2 : 1, mr: showAiChat ? 1 : 0 }}>
              <TinyHtmlEditor 
                initialHtml={tempHtmlContent} 
                onChange={setTempHtmlContent}
                disabled={aiLoading || submitting}
              />
            </Box>
            
            {/* Chatbot IA pour assistance - affichage conditionnel */}
            {showAiChat && (
              <Box sx={{ flex: 1, ml: 1, borderLeft: 1, borderColor: 'divider', pl: 1 }}>
                <HtmlChatBot
                  currentHtml={tempHtmlContent}
                  onHtmlChange={setTempHtmlContent}
                  disabled={submitting}
                  onLoadingChange={setAiLoading}
                />
              </Box>
            )}
          </Box>
        </Box>
      )}
    </>
  );

  // Rendu conditionnel selon le mode (dialog ou page)
  if (isEditingMode) {
    // Mode édition plein écran
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
          overflow: "visible", // Ne pas cacher les menus déroulants qui dépassent le dialog
          minHeight: '80vh' // Hauteur minimum
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
      {/* Les boutons d'action sont conditionnellement affichés dans le dialog selon la source */}
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
        {/* Les boutons d'action sont affichés sous le formulaire quand on n'est pas en dialog */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {actionButtons}
        </Box>
      </form>
    </Box>
  );
};

export default ResourceForm;
