import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Alert,
  CircularProgress,
  Typography,
  Stack,
  Chip,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import sequenceService from '../../services/sequenceService';
import { useTreeData } from '../../contexts/TreeDataContext';

/**
 * Composant de formulaire pour la création et l'édition de séquences
 * 
 * @param {Object} props - Propriétés du composant
 * @param {boolean} props.open - Indique si le dialogue est ouvert (uniquement en mode dialogue)
 * @param {Function} props.onClose - Fonction appelée à la fermeture du dialogue
 * @param {boolean} props.isDialog - Indique si le formulaire est affiché dans un dialogue
 * @param {Object} props.initialData - Données initiales pour le formulaire (pour l'édition)
 * @param {boolean} props.isEdit - Indique si le formulaire est en mode édition
 * @param {Function} props.onSuccess - Fonction appelée après une soumission réussie
 * @param {string} props.sequenceId - ID de la séquence (pour l'édition)
 * @param {number} props.progressionId - ID de la progression parente (pour la création)
 */
const SequenceForm = ({
  open,
  onClose,
  isDialog = true,
  initialData = null,
  isEdit = false,
  onSuccess,
  sequenceId,
  progressionId
}) => {
  // --- États ---
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    progression_id: progressionId || null,
  });
  
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { refreshTreeData } = useTreeData();

  // --- Nouvelle logique : détection de modifications non sauvegardées ---
  const [isDirty, setIsDirty] = useState(false);

  // Détection des changements dans les champs principaux
  useEffect(() => {
    if (!initialData) return;
    const dirty =
      formData.title !== (initialData.title || '') ||
      formData.description !== (initialData.description || '') ||
      formData.progression_id !== (initialData.progression_id || progressionId || null);
    setIsDirty(dirty);
  }, [formData, initialData, progressionId]);

  // --- Effets ---

  // Initialisation du formulaire avec les données existantes
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        progression_id: initialData.progression_id || progressionId || null,
      });
    } else if (progressionId) {
      setFormData(prev => ({
        ...prev,
        progression_id: progressionId
      }));
    }
  }, [initialData, progressionId]);

  // Chargement de la séquence existante en mode édition
  useEffect(() => {
    const fetchSequenceData = async () => {
      if (isEdit && sequenceId) {
        try {
          const data = await sequenceService.getSequenceById(sequenceId);
          setFormData({
            title: data.title || '',
            description: data.description || '',
            progression_id: data.progression_id || progressionId || null,
          });
        } catch (err) {
          setError("Erreur lors du chargement de la séquence: " + (err.detail || err.message || "Erreur inconnue"));
        }
      }
    };

    if (isEdit && sequenceId) {
      fetchSequenceData();
    }
  }, [isEdit, sequenceId, progressionId]);

  // DEBUG : Affiche le JSON brut reçu pour la séquence en édition
  useEffect(() => {
    if (isEdit && sequenceId) {
      sequenceService.getSequenceById(sequenceId).then((data) => {
        // eslint-disable-next-line no-console
        console.log('[DEBUG FRONT] JSON séquence', data);
      });
    }
  }, [isEdit, sequenceId]);

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
        throw new Error("Le titre de la séquence est requis");
      }

      if (!formData.progression_id) {
        throw new Error("Une progression parente est requise");
      }

      // Construction des données à envoyer
      const sequenceData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        progression_id: parseInt(formData.progression_id, 10), // S'assurer que c'est bien un nombre
      };
      
      const finalSequenceData = {
        ...sequenceData,
      };

      console.log('Données soumises:', {
        ...finalSequenceData,
        progressionIdType: typeof finalSequenceData.progression_id
      });

      let result;
      
      if (isEdit) {
        // Mise à jour de la séquence existante
        result = await sequenceService.updateSequence(sequenceId, finalSequenceData);
        setSuccess("Séquence modifiée avec succès !");
      } else {
        // Création d'une nouvelle séquence
        console.log('Création de la séquence:', finalSequenceData);
        result = await sequenceService.createSequence(finalSequenceData);
        setSuccess('Séquence créée avec succès !');
        if (onSuccess) onSuccess(result); // Appeler le callback
      }

      // Mise à jour de l'arbre après succès
      await refreshTreeData();

      // Gestion de la redirection ou fermeture du dialogue
      if (isDialog) {
        // Fermer le dialogue après un court délai pour montrer le message de succès
        setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, 1500);
      } else {
        // En mode page complète, rediriger vers les détails de la séquence ou retourner à la page précédente
        setTimeout(() => {
          if (isEdit) {
            navigate(`/sequences/${sequenceId}`);
          } else if (result && result.id) {
            navigate(`/sequences/${result.id}`);
          } else {
            navigate(-1);
          }
        }, 1500);
      }
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
            label="Titre de la séquence"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            disabled={submitting}
            placeholder="Entrez un titre descriptif pour la séquence"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            multiline
            rows={4}
            disabled={submitting}
            placeholder="Décrivez le contenu et les objectifs de cette séquence..."
          />
        </Grid>



        {/* Le champ progression_id est généralement caché car fourni automatiquement */}
        <input type="hidden" name="progression_id" value={formData.progression_id || ''} />
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
          {isEdit ? "Modifier la séquence" : 'Ajouter une nouvelle séquence'}
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
        <CardHeader title={isEdit ? "Modifier la séquence" : 'Ajouter une nouvelle séquence'} />
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

export default SequenceForm;
