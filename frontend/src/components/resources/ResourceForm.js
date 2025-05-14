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
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import resourceTypeService from '../../services/resourceTypeService';
import resourceService from '../../services/resourceService'; 
import fusionService from '../../services/fusionService';
import studyObjectService from '../../services/studyObjectService';
import DynamicAIForm from '../DynamicAIForm';
import api from '../../services/api'; // Correction du chemin d'import

/**
 * Composant de formulaire réutilisable pour la création et l'édition de ressources
 * 
 * @param {Object} props - Propriétés du composant
 * @param {boolean} props.open - Indique si le dialogue est ouvert (uniquement en mode dialogue)
 * @param {Function} props.onClose - Fonction appelée à la fermeture du dialogue
 * @param {Object} props.session - Session associée à la ressource (optionnel)
 * @param {boolean} props.isDialog - Indique si le formulaire est affiché dans un dialogue
 * @param {Object} props.initialData - Données initiales pour le formulaire (pour l'édition)
 * @param {boolean} props.isEdit - Indique si le formulaire est en mode édition
 * @param {Function} props.onSuccess - Fonction appelée après une soumission réussie
 * @param {string} props.resourceId - ID de la ressource (pour l'édition)
 */
const ResourceForm = ({ 
  open, 
  onClose, 
  session, 
  isDialog = true, 
  initialData = null,
  isEdit = false,
  onSuccess,
  resourceId
}) => {
  // --- DEBUG: Affichage du contenu initialData pour diagnostic ---
  useEffect(() => {
    if (isEdit) {
      console.log('[DEBUG ResourceForm] initialData transmis au formulaire :', initialData);
    }
  }, [isEdit, initialData]);

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
  const { } = useAuth(); 
  const MAX_FILE_SIZE = 1 * 1024 * 1024; 
  const ALLOWED_FILE_TYPE = 'application/pdf';

  // --- Animation de chargement pour la génération IA ---
  const [aiLoading, setAiLoading] = useState(false);

  const [allStudyObjects, setAllStudyObjects] = useState([]);
  const [selectedStudyObjects, setSelectedStudyObjects] = useState([]);

  // --- Effets --- 

  // Initialisation du formulaire avec les données existantes
  useEffect(() => {
    // Vérifier que initialData existe et que les types sont chargés
    if (initialData && resourceTypes.length > 0) {
        console.log('[DEBUG ResourceForm] initialData avant traitement:', initialData); // Log pour debug
        const initialTypeId = initialData.type_id ? String(initialData.type_id) : '';
        const initialSubTypeId = initialData.sub_type_id ? String(initialData.sub_type_id) : '';

        // Créer un nouvel objet formData avec TOUS les champs d'initialData
        const newFormData = {
            ...initialData, // Copier TOUS les champs d'initialData d'abord
            title: initialData.title || '',
            description: initialData.description || '',
            resource_type_id: initialTypeId,       // Clé correcte pour l'état
            resource_sub_type_id: initialSubTypeId, // Clé correcte pour l'état
            session_ids: initialData.session_ids || (session ? [session.id] : []), // Utiliser session_ids de ResourceEdit
            url: initialData.url || '', // Inclure l'URL si elle fait partie des initialData
        };
        
        setFormData(newFormData); // Utiliser le nouvel objet complet
        setSourceType(initialData.source_type || 'ai'); // Mettre à jour aussi l'état sourceType
        if (Array.isArray(initialData.study_objects)) {
          setSelectedStudyObjects(initialData.study_objects);
        } else if (Array.isArray(initialData.study_object_ids) && Array.isArray(allStudyObjects) && allStudyObjects.length > 0) {
          // fallback si study_objects absent mais study_object_ids présent
          setSelectedStudyObjects(allStudyObjects.filter(obj => initialData.study_object_ids.includes(obj.id)));
        }
        // Charger les sous-types correspondants si un type est sélectionné
        if (initialTypeId) {
            fetchSubTypes(initialTypeId);
        }
    } else if (!isEdit && session) {
        // Cas création simple avec session pré-remplie
        setFormData(prev => ({ ...prev, session_ids: [session.id] }));
    } else if (!isEdit && !initialData) {
        // Reset normal pour création (si pas de données initiales)
        // (Optionnel, dépend si on veut garder les valeurs entre créations)
        // setFormData({ title: '', description: '', ... });
        // setSourceType('ai');
        // setSelectedFile(null);
    }
  }, [initialData, resourceTypes, session, isEdit, allStudyObjects]); // Ajout allStudyObjects pour fallback

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
  }, [formData.resource_type_id, fetchSubTypes]); // Ajout de fetchSubTypes dans les dépendances

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

  // Synchronisation INITIALE des objets d'étude sélectionnés en édition - Une seule fois au chargement
  useEffect(() => {
    if (
      isEdit &&
      initialData &&
      Array.isArray(initialData.study_object_ids) &&
      allStudyObjects.length > 0 &&
      selectedStudyObjects.length === 0 // Seulement si aucune sélection manuelle n'a été faite
    ) {
      const selected = allStudyObjects.filter(obj => initialData.study_object_ids.includes(obj.id));
      setSelectedStudyObjects(selected);
    }
  }, [isEdit, initialData, allStudyObjects, selectedStudyObjects.length]); // Ajout de selectedStudyObjects.length dans les dépendances

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

  const handleSourceTypeChange = (e) => {
    setSourceType(e.target.value);
    // Réinitialiser le fichier/erreur si on passe à 'file'
    if (e.target.value === 'file') {
        setSelectedFile(null);
        setFileError('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        // Validation côté client
        if (file.type !== ALLOWED_FILE_TYPE) {
            setFileError(`Type de fichier non autorisé. Seul ${ALLOWED_FILE_TYPE} est accepté.`);
            setSelectedFile(null);
        } else if (file.size > MAX_FILE_SIZE) {
            setFileError(`Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo).`);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    // Vérification spécifique si source_type est 'file'
    if (sourceType === 'file' && !selectedFile && !isEdit) { 
        setFileError('Veuillez sélectionner un fichier PDF.');
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
    dataToSend.append('title', formData.title);
    if (formData.resource_type_id) dataToSend.append('type_id', formData.resource_type_id);
    if (formData.resource_sub_type_id) dataToSend.append('sub_type_id', formData.resource_sub_type_id);
    dataToSend.append('source_type', sourceType);
    
    // !! Important : Envoyer les session_ids comme une chaîne JSON
    const sessionIdsJson = JSON.stringify(formData.session_ids || []);
    dataToSend.append('session_ids_json', sessionIdsJson);

    // --- AJOUT : transmettre les associations d'objets d'étude ---
    const studyObjectIds = selectedStudyObjects.map(obj => obj.id);
    dataToSend.append('study_object_ids_json', JSON.stringify(studyObjectIds));
    console.log('[DEBUG] Objets d\'étude sélectionnés:', selectedStudyObjects);
    console.log('[DEBUG] IDs objets d\'étude à envoyer:', studyObjectIds);

    if (sourceType === 'file') {
        if (selectedFile) { 
            dataToSend.append('file', selectedFile);
        } else if (isEdit && initialData?.source_type === 'file') {
            // En mode édition d'un fichier existant, si aucun nouveau fichier n'est sélectionné,
            // on n'envoie pas le champ 'file' pour indiquer qu'il ne faut pas le changer.
            // Le backend devrait ignorer l'absence de 'file' dans ce cas.
        } else if (!isEdit) {
             // Ce cas est déjà géré par la validation au début
        }
    } else { // sourceType === 'ai'
        // Ajouter les champs AI (même s'ils sont vides, le backend les gère comme Nullable)
        // dataToSend.append('ai_prompt', formData.ai_prompt);
        // dataToSend.append('ai_model', formData.ai_model);
        // dataToSend.append('ai_raw_output', formData.ai_raw_output);
    }

    // Si IA, le chemin du HTML généré sera géré par DynamicAIForm
    if (sourceType === 'ai') {
      // Cette partie est maintenant gérée par DynamicAIForm
    }

    try {
        let response;
        if (isEdit) {
            console.log("Updating resource with FormData:", Object.fromEntries(dataToSend.entries()));
            response = await resourceService.update(resourceId, dataToSend); 
            setSuccess('Ressource modifiée avec succès!');
        } else {
            console.log("Creating resource with FormData:", Object.fromEntries(dataToSend.entries()));
             response = await resourceService.create(dataToSend); 
            setSuccess('Ressource ajoutée avec succès!');
        }

        // Appeler onSuccess après un délai pour afficher le message
        setTimeout(() => {
          if (onSuccess) onSuccess(response); // Passer la réponse à la fonction parent
          if (isDialog) onClose(); // Fermer le dialogue
          else navigate(-1); // Revenir en arrière si en mode page
        }, 1500);

    } catch (err) {
        const ajoutOuModif = isEdit ? 'la modification' : 'l’ajout';
        console.error(`Erreur lors de ${ajoutOuModif} de la ressource:`, err);
        console.error("Backend Error Detail:", err.response?.data?.detail);
        
        // Formatage du message d'erreur pour l'affichage
        let displayError = `Échec de ${ajoutOuModif}.`; // Message par défaut
        const detail = err.response?.data?.detail;

        if (Array.isArray(detail)) {
            // Si detail est un tableau (erreur de validation FastAPI)
            displayError = detail.map(e => `${e.loc ? e.loc.join('.') : 'Erreur'}: ${e.msg}`).join(', \n');
        } else if (typeof detail === 'string') {
            // Si detail est une simple chaîne
            displayError = detail;
        } else if (err.message) {
            // Fallback sur le message d'erreur général d'Axios
            displayError = err.message;
        }
        
        setError(displayError); // Passer la chaîne formatée à setError

        // Si l'erreur formatée concerne le fichier
        if (displayError.includes("fichier")) { 
            setFileError(displayError);
        } else if (displayError.toLowerCase().includes("file")) { // Gérer le cas où le backend dit "file"
             setFileError(displayError);
        }
    } finally {
        setSubmitting(false);
    }
  };

  // Fonction dédiée pour la génération d'un QCM via l'API IA
  // La fonction handleQCMGeneration a été supprimée car cette fonctionnalité est maintenant
  // entièrement gérée par le composant DynamicAIForm

  // La fonction handleFusion a été supprimée car cette fonctionnalité est maintenant 
  // entièrement gérée par le composant DynamicAIForm

  // --- Rendu JSX --- 

  // Clé type & sous-type sélectionnés
  const selectedType = resourceTypes.find(t => String(t.id) === String(formData.resource_type_id));
  const selectedSubType = resourceSubTypes.find(st => String(st.id) === String(formData.resource_sub_type_id));

  // Afficher le formulaire IA si on est en mode IA et que les deux menus sont sélectionnés
  const showAIGenerationForm = sourceType === 'ai' && selectedType && selectedSubType;

  // Gestionnaire de génération IA avec animation - 
  // Supprimé car la génération est maintenant gérée par DynamicAIForm
  const handleAIGenerationWithLoading = async (payload) => {
    setAiLoading(true);
    try {
      // La génération est maintenant gérée dans DynamicAIForm
    } finally {
      setAiLoading(false);
    }
  };

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

        {/* Sélecteur Type / Sous-type */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel id="type-label">Type</InputLabel>
            <Select
              labelId="type-label"
              name="resource_type_id"
              value={formData.resource_type_id || ''}
              onChange={handleInputChange}
              label="Type"
              disabled={loadingTypes || resourceTypes.length === 0 || submitting}
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
              disabled={!formData.resource_type_id || resourceSubTypes.length === 0 || submitting}
            >
              {resourceSubTypes.map((subType) => (
                <MenuItem key={subType.id} value={String(subType.id)}>
                  {subType.value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Sélecteur Source Type */}
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
                    <FormControlLabel value="file" control={<Radio />} label="Fichier PDF" />
                </RadioGroup>
            </FormControl>
        </Grid>

        {/* Affichage du lien vers le document lié à la ressource en mode édition */}
        {isEdit && initialData?.source_type === 'ai' && initialData?.file_path && (
            <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                    Document actuellement lié :{' '}
                    <a
                        href={`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000'}/media/uploads/${initialData.file_path.startsWith('/') ? initialData.file_path.substring(1) : initialData.file_path}`.replace(/\\/g, '/')}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Ouvrir le document généré
                    </a><br />
                    <span style={{fontStyle: 'italic', color: '#888'}}>Ce document est celui actuellement rattaché à la ressource.</span>
                </Alert>
            </Grid>
        )}

        {/* Sélecteur Fichier */}
        {sourceType === 'file' && (
            <Grid item xs={12}>
                <Box sx={{ border: '1px dashed grey', padding: 2, textAlign: 'center' }}>
                    <input
                        accept={ALLOWED_FILE_TYPE}
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
                            Choisir un fichier PDF (Max 1 Mo)
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
        <Grid item xs={12}>
          <Autocomplete
            multiple
            options={allStudyObjects || []}
            getOptionLabel={option => option && option.title ? option.title : ''}
            value={selectedStudyObjects || []}
            onChange={(e, newValue) => {
              setSelectedStudyObjects(newValue || []);
            }}
            renderInput={params => (
              <TextField {...params} label="Objets d'étude associés" placeholder="Sélectionner..." margin="normal" />
            )}
            isOptionEqualToValue={(option, value) => option && value && option.id === value.id}
            sx={{ mt: 2, zIndex: 1000 }}
            disabled={submitting}
          />
        </Grid>
      </Grid>
      {showAIGenerationForm && (
        <Box sx={{ mt: 2 }}>
          <Card>
            <CardHeader title={`Ajouter une ressource générée par l'IA`} />
            <CardContent>
              {aiLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
                  <CircularProgress size={28} color="primary" />
                  <span style={{ fontWeight: 500 }}>Génération en cours...</span>
                </div>
              )}
              <DynamicAIForm
                typeKey={selectedType.key.toLowerCase()}
                subtypeKey={selectedSubType.key.toLowerCase()}
                typeId={selectedType.id}
                subtypeId={selectedSubType.id}
                initialTitle={formData.title}
                initialDescription={formData.description}
                onSuccess={(resourceId) => {
                  console.log('[DEBUG] Ressource créée avec succès, ID:', resourceId);
                  // Informer le parent du succès
                  if (onSuccess) {
                    onSuccess(resourceId);
                  }
                  
                  // Fermer le dialog si c'est un dialog
                  if (isDialog && onClose) {
                    console.log('[DEBUG] Fermeture du dialog');
                    onClose();
                  } else {
                    // Sinon rediriger vers la liste des ressources
                    console.log('[DEBUG] Redirection vers /resources');
                    navigate('/resources');
                  }
                }}
                onClose={() => {
                  console.log('[DEBUG] Fermeture du formulaire via onClose');
                  if (isDialog && onClose) {
                    onClose();
                  } else {
                    // Rediriger vers la liste des ressources en utilisant useNavigate qui préserve le contexte d'authentification
                    console.log('[DEBUG] Redirection vers /resources via navigate()');
                    navigate('/resources');
                  }
                }}
              />
            </CardContent>
          </Card>
        </Box>
      )}
    </>
  );
  
  // Boutons d'action partagés
  const actionButtons = (
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
        onClick={handleSubmit} 
        disabled={submitting || (sourceType === 'file' && !!fileError)}
        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {submitting ? (isEdit ? 'Modification...' : 'Ajout...') : (isEdit ? 'Modifier' : 'Ajouter')}
      </Button>
    </>
  );

  // --- Rendu final (Dialogue ou Page) --- 

  // Rendu en mode dialogue
  if (isDialog) {
    return (
      <Dialog open={open} onClose={submitting ? () => {} : onClose} maxWidth="md" fullWidth> 
        <DialogTitle>
          {isEdit ? 'Modifier la ressource' : 'Ajouter une nouvelle ressource'}
          <IconButton
            aria-label="close"
            onClick={submitting ? undefined : onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
            disabled={submitting}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <form onSubmit={handleSubmit}>
          <DialogContent dividers> 
            {formContent}
          </DialogContent>

          <DialogActions>
            {actionButtons}
          </DialogActions>
        </form>
      </Dialog>
    );
  }

  // Rendu en mode page
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}> 
      <Card>
        <CardHeader title={isEdit ? 'Modifier la ressource' : 'Ajouter une nouvelle ressource'} />
        <CardContent>
          <form onSubmit={handleSubmit}>
            {formContent}
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {actionButtons}
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResourceForm;
