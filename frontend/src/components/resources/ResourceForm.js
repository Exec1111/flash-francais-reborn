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
  FormLabel 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile'; 
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import resourceTypeService from '../../services/resourceTypeService';
import resourceService from '../../services/resourceService'; 

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
  // --- États --- 
  const [formData, setFormData] = useState({
    title: '',
    resource_type_id: '',
    resource_sub_type_id: '',
    session_ids: session ? [session.id] : [], 
    ai_prompt: '',
    ai_model: '',
    ai_raw_output: ''
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
  const { token } = useAuth(); 
  const navigate = useNavigate();
  const MAX_FILE_SIZE = 1 * 1024 * 1024; 
  const ALLOWED_FILE_TYPE = 'application/pdf';

  // --- Effets --- 

  // Initialisation du formulaire avec les données existantes
  useEffect(() => {
    if (initialData && resourceTypes.length > 0) {
      const typeId = initialData.resource_type_id ? String(initialData.resource_type_id) : '';
      setFormData(prev => ({
        ...prev,
        ...initialData,
        resource_type_id: typeId,
        resource_sub_type_id: initialData.resource_sub_type_id ? String(initialData.resource_sub_type_id) : '',
        session_ids: initialData.sessions ? initialData.sessions.map(s => s.id) : (session ? [session.id] : []), 
        ai_prompt: initialData.ai_prompt || '',
        ai_model: initialData.ai_model || '',
        ai_raw_output: initialData.ai_raw_output || ''
      }));
      setSourceType(initialData.source_type || 'ai'); 

      if (typeId) {
        fetchSubTypes(typeId); 
      }

      // Si c'est une ressource de type fichier, afficher le nom (on ne recharge pas le fichier)
      if (initialData.source_type === 'file' && initialData.file_name) {
        // Optionnel: afficher le nom du fichier existant
        // On ne peut pas re-sélectionner le fichier automatiquement pour des raisons de sécurité
      }

    } else if (!isEdit && session) {
      // Cas création avec session pré-remplie
      setFormData(prev => ({ ...prev, session_ids: [session.id] }));
    } else if (!isEdit) {
      // Reset pour la création sans données initiales
      setFormData({
        title: '',
        resource_type_id: '',
        resource_sub_type_id: '',
        session_ids: [],
        ai_prompt: '',
        ai_model: '',
        ai_raw_output: ''
      });
      setSourceType('ai');
      setSelectedFile(null);
      setFileError('');
    }
  }, [initialData, resourceTypes, isEdit, session]); 

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
      setError('Impossible de charger les sous-types');
    }
  }, []); 

  useEffect(() => {
    // Charger les sous-types si type_id change et est défini
    if (formData.resource_type_id) {
        fetchSubTypes(formData.resource_type_id);
    }
  }, [formData.resource_type_id, fetchSubTypes]); 

  // --- Gestionnaires d'événements ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Si le type change, réinitialiser le sous-type et recharger les sous-types
    if (name === 'resource_type_id') {
        setFormData(prev => ({ ...prev, resource_sub_type_id: '' })); 
        fetchSubTypes(value); 
    }
  };

  const handleSourceTypeChange = (e) => {
    setSourceType(e.target.value);
    // Réinitialiser le fichier/erreur si on passe à 'ai'
    if (e.target.value === 'ai') {
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
        dataToSend.append('ai_prompt', formData.ai_prompt);
        dataToSend.append('ai_model', formData.ai_model);
        dataToSend.append('ai_raw_output', formData.ai_raw_output);
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
        console.error(`Erreur lors de ${isEdit ? 'la modification' : 'l\'ajout'} de la ressource:`, err);
        console.error("Backend Error Detail:", err.response?.data?.detail);
        
        // Formatage du message d'erreur pour l'affichage
        let displayError = `Échec de ${isEdit ? 'la modification' : 'l\'ajout'}.`; // Message par défaut
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

  // --- Rendu JSX --- 

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

        {/* Champs conditionnels AI ou Fichier */}
        {sourceType === 'ai' ? (
            <>
                <Grid item xs={12}>
                    <TextField 
                        fullWidth 
                        label="Prompt IA (optionnel)" 
                        name="ai_prompt" 
                        value={formData.ai_prompt}
                        onChange={handleInputChange}
                        multiline 
                        rows={2} 
                        disabled={submitting} 
                    />
                </Grid>
                {/* Ajouter d'autres champs AI si nécessaire (ai_model, ai_raw_output) */}
                 <Grid item xs={12}>
                    <TextField 
                        fullWidth 
                        label="Modèle IA utilisé (optionnel)" 
                        name="ai_model" 
                        value={formData.ai_model}
                        onChange={handleInputChange}
                        disabled={submitting} 
                    />
                </Grid>
                 <Grid item xs={12}>
                    <TextField 
                        fullWidth 
                        label="Sortie brute IA (optionnel)" 
                        name="ai_raw_output" 
                        value={formData.ai_raw_output}
                        onChange={handleInputChange}
                        multiline 
                        rows={3}
                        disabled={submitting} 
                    />
                </Grid>
            </>
        ) : (
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
                     {/* Afficher le nom du fichier existant en mode édition */}
                     {isEdit && initialData?.source_type === 'file' && !selectedFile && initialData.file_name && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                            Fichier actuel: {initialData.file_name} (choisir un nouveau fichier pour remplacer)
                        </Typography>
                    )}
                </Box>
            </Grid>
        )}

        {/* Supprimer l'ancien champ 'content' */}
        {/* 
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Contenu"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            multiline
            rows={4}
            disabled={submitting}
          />
        </Grid> 
        */}
      </Grid>
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
