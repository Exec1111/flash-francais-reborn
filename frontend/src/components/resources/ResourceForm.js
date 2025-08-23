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
  Autocomplete
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile'; 
import { useNavigate } from 'react-router-dom';
import resourceTypeService from '../../services/resourceTypeService';
import resourceService from '../../services/resourceService'; 
import studyObjectService from '../../services/studyObjectService';
import oeuvreService from '../../services/oeuvreService';
import configService from '../../services/configService';
import DynamicAIForm from '../DynamicAIForm/index';  
import TinyHtmlEditor from '../editors/TinyHtmlEditor';

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
    if (!initialData) return;
    if (
      initialData.html_url ||
      initialData.html_content_url ||
      (initialData.file_path || '').endsWith('.html') ||
      (initialData.url || '').endsWith('.html')
    ) {
      const relativeUrlRaw = initialData.html_url || initialData.html_content_url || initialData.file_path || initialData.url;
      // Remplacer les backslashes éventuels par des slashs pour une URL valide
      const relativeUrl = (relativeUrlRaw || '').replace(/\\/g, '/');
      let fullUrl;
      if (relativeUrl.startsWith('http')) {
        fullUrl = relativeUrl;
      } else {
        let base = process.env.REACT_APP_API_BASE_URL || '';
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
      fetch(fullUrl)
        .then(res => res.text())
        .then(setHtmlContent)
        .catch(() => setHtmlContent(''));
    }
  }, [initialData]);

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
  const actionButtons = (!isEdit && sourceType === 'ai') ? null : (
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
            <Typography variant="h6" gutterBottom>Éditer le contenu HTML</Typography>
            <TinyHtmlEditor initialHtml={htmlContent} onChange={setHtmlContent} />
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
                    href={`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000'}/media/uploads/${initialData.file_path.startsWith('/') ? initialData.file_path.substring(1) : initialData.file_path}`.replace(/\\/g, '/')}
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
    </>
  );

  // Rendu conditionnel selon le mode (dialog ou page)
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
