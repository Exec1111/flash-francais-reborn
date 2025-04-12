import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import objectiveService from '../../services/objectiveService';

/**
 * Composant de formulaire réutilisable pour la création et l'édition d'objectifs pédagogiques
 * 
 * @param {Object} props - Propriétés du composant
 * @param {boolean} props.open - Indique si le dialogue est ouvert (uniquement en mode dialogue)
 * @param {Function} props.onClose - Fonction appelée à la fermeture du dialogue
 * @param {Object} props.session - Session associée à l'objectif (optionnel)
 * @param {boolean} props.isDialog - Indique si le formulaire est affiché dans un dialogue
 * @param {Object} props.initialData - Données initiales pour le formulaire (pour l'édition)
 * @param {boolean} props.isEdit - Indique si le formulaire est en mode édition
 * @param {Function} props.onSuccess - Fonction appelée après une soumission réussie
 * @param {string} props.objectiveId - ID de l'objectif (pour l'édition)
 */
const ObjectiveForm = ({
  open,
  onClose,
  session,
  isDialog = true,
  initialData = null,
  isEdit = false,
  onSuccess,
  objectiveId
}) => {
  // --- États ---
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    session_ids: session ? [session.id] : [],
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- Effets ---

  // Initialisation du formulaire avec les données existantes
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        session_ids: initialData.session_ids || (session ? [session.id] : []),
      });
    }
  }, [initialData, session]);

  // Chargement de l'objectif existant en mode édition
  useEffect(() => {
    const fetchObjectiveData = async () => {
      if (isEdit && objectiveId) {
        try {
          const data = await objectiveService.getObjectiveById(objectiveId);
          setFormData({
            title: data.title || '',
            description: data.description || '',
            session_ids: data.session_ids || [],
          });
        } catch (err) {
          setError("Erreur lors du chargement de l'objectif: " + (err.detail || err.message || "Erreur inconnue"));
        }
      }
    };

    fetchObjectiveData();
  }, [isEdit, objectiveId]);

  // --- Handlers ---

  // Gestion des changements dans les champs de formulaire
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Validation du formulaire
      if (!formData.title.trim()) {
        throw new Error("Le titre de l'objectif est requis");
      }

      // Construction des données à envoyer
      const objectiveData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
      };

      let result;
      
      if (isEdit) {
        // Mise à jour de l'objectif existant
        result = await objectiveService.updateObjective(objectiveId, objectiveData);
        setSuccess("Objectif mis à jour avec succès!");
      } else {
        // Création d'un nouvel objectif
        result = await objectiveService.createObjective(objectiveData);
        setSuccess("Objectif créé avec succès!");
        
        // Si nous avons une session, associer l'objectif à cette session
        if (session && session.id && result.id) {
          await objectiveService.linkObjectiveToSession(session.id, result.id);
        }
      }

      // Réinitialiser le formulaire si pas en mode dialogue et pas en mode édition
      if (!isDialog && !isEdit) {
        setFormData({
          title: '',
          description: '',
          session_ids: session ? [session.id] : [],
        });
      }

      // Appeler le callback onSuccess si fourni
      if (onSuccess) {
        onSuccess(result);
      }

      // Redirection vers la liste des objectifs
      setTimeout(() => {
        if (isDialog) {
          // Si c'est un dialogue, le fermer d'abord
          if (onClose) onClose();
        }
        // Rediriger vers la liste des objectifs après un court délai pour permettre de voir le message de succès
        navigate('/objectives');
      }, 1500);
    } catch (err) {
      setError("Erreur: " + (err.detail || err.message || "Une erreur est survenue"));
    } finally {
      setSubmitting(false);
    }
  };

  // --- Rendu du contenu du formulaire ---
  const formContent = (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Titre de l'objectif"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            disabled={submitting}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            multiline
            rows={4}
            disabled={submitting}
            placeholder="Décrivez l'objectif pédagogique en détail..."
          />
        </Grid>
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
        disabled={submitting}
        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {submitting ? (isEdit ? 'Modification...' : 'Création...') : (isEdit ? 'Modifier' : 'Créer')}
      </Button>
    </>
  );

  // --- Rendu final (Dialogue ou Page) ---

  // Rendu en mode dialogue
  if (isDialog) {
    return (
      <Dialog open={open} onClose={submitting ? () => {} : onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEdit ? "Modifier l'objectif" : 'Ajouter un nouvel objectif'}
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
        <CardHeader title={isEdit ? "Modifier l'objectif" : 'Ajouter un nouvel objectif'} />
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

export default ObjectiveForm;
