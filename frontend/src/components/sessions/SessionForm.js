import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTreeData } from '../../contexts/TreeDataContext';
import {
  TextField,
  Button,
  Grid,
  Box,
  Alert,
  Card,
  CardHeader,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../services/api';

/**
 * Composant de formulaire pour la création et l'édition de séances
 * 
 * @param {Object} props - Propriétés du composant
 * @param {boolean} props.open - Indique si le dialogue est ouvert (uniquement en mode dialogue)
 * @param {Function} props.onClose - Fonction appelée à la fermeture du dialogue
 * @param {boolean} props.isDialog - Indique si le formulaire est affiché dans un dialogue
 * @param {Object} props.initialData - Données initiales pour le formulaire (pour l'édition)
 * @param {boolean} props.isEdit - Indique si le formulaire est en mode édition
 * @param {Function} props.onSuccess - Fonction appelée après une soumission réussie
 * @param {string} props.sessionId - ID de la séance (pour l'édition)
 * @param {number} props.sequenceId - ID de la séquence parente (pour la création)
 */
const SessionForm = ({
  open,
  onClose,
  isDialog = true,
  initialData = null,
  isEdit = false,
  onSuccess,
  sessionId,
  sequenceId
}) => {
  // --- États ---
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    date: new Date().toISOString().split('T')[0], // Date au format YYYY-MM-DD
    duration: 60, // Durée par défaut en minutes
    sequence_id: sequenceId || null,
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { refreshTreeData } = useTreeData();

  // --- Effets ---

  // Initialisation du formulaire avec les données existantes
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        notes: initialData.notes || '',
        date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        duration: initialData.duration ? (typeof initialData.duration === 'string' ? parseInt(initialData.duration.replace(/PT(\d+)M/, '$1')) : initialData.duration) : 60,
        sequence_id: initialData.sequence_id || sequenceId || null,
      });
    } else if (sequenceId) {
      setFormData(prev => ({
        ...prev,
        sequence_id: sequenceId
      }));
    }
  }, [initialData, sequenceId]);

  // Chargement de la séance existante en mode édition
  useEffect(() => {
    const fetchSessionData = async () => {
      if (isEdit && sessionId) {
        try {
          const token = localStorage.getItem('token');
          const response = await api.get(`/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = response.data;
          
          setFormData({
            title: data.title || '',
            notes: data.notes || '',
            date: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            duration: data.duration ? (typeof data.duration === 'string' ? parseInt(data.duration.replace(/PT(\d+)M/, '$1')) : data.duration) : 60,
            sequence_id: data.sequence_id || null,
          });
        } catch (err) {
          setError("Erreur lors du chargement de la séance: " + (err.response?.data?.detail || err.message || "Erreur inconnue"));
        }
      }
    };

    fetchSessionData();
  }, [isEdit, sessionId]);

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
        throw new Error("Le titre de la séance est requis");
      }
      
      if (!formData.date) {
        throw new Error("La date de la séance est requise");
      }

      if (!formData.sequence_id) {
        throw new Error("Une séquence parente est requise");
      }

      // Construction des données à envoyer
      const sessionData = {
        title: formData.title.trim(),
        notes: formData.notes.trim() || null,
        date: new Date(formData.date).toISOString(),
        duration: parseInt(formData.duration, 10) || 60, // Durée en minutes (nombre entier)
        sequence_id: parseInt(formData.sequence_id, 10), // S'assurer que c'est bien un nombre
      };
      
      console.log('Données envoyées à l\'API:', sessionData);

      const token = localStorage.getItem('token');
      let result;
      
      if (isEdit) {
        // Mise à jour de la séance existante
        const response = await api.put(`/sessions/${sessionId}`, sessionData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        result = response.data;
        setSuccess("Séance modifiée avec succès !");
      } else {
        // Création d'une nouvelle séance
        // Utiliser l'endpoint direct pour les sessions
        const response = await api.post('/sessions', sessionData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        result = response.data;
        setSuccess("Nouvelle séance créée avec succès !");
      }

      // Rafraîchir l'arbre des données
      refreshTreeData();

      // Appeler le callback onSuccess si fourni
      if (onSuccess) {
        onSuccess(result);
      }

      // Gérer la redirection en fonction du mode (dialogue ou page complète)
      if (isDialog) {
        // Fermer le dialogue après un court délai pour montrer le message de succès
        setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, 1500);
      } else {
        // En mode page complète, rediriger vers les détails de la séance ou retourner à la page précédente
        setTimeout(() => {
          if (isEdit) {
            navigate(`/sessions/${sessionId}`);
          } else if (result && result.id) {
            navigate(`/sessions/${result.id}`);
          } else {
            navigate(-1);
          }
        }, 1500);
      }
    } catch (err) {
      setError("Erreur: " + (err.response?.data?.detail || err.message || "Une erreur est survenue"));
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
            label="Titre de la séance"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            disabled={submitting}
            placeholder="Entrez un titre descriptif pour la séance"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            multiline
            rows={4}
            disabled={submitting}
            placeholder="Ajoutez des notes sur le contenu et les objectifs de cette séance..."
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Date de la séance"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleInputChange}
            disabled={submitting}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Durée (minutes)"
            name="duration"
            type="number"
            value={formData.duration}
            onChange={handleInputChange}
            disabled={submitting}
            InputProps={{ inputProps: { min: 5, step: 5 } }}
          />
        </Grid>

        {/* Le champ sequence_id est généralement caché car fourni automatiquement */}
        <input type="hidden" name="sequence_id" value={formData.sequence_id || ''} />
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
          {isEdit ? "Modifier la séance" : 'Ajouter une nouvelle séance'}
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
        <CardHeader title={isEdit ? "Modifier la séance" : 'Ajouter une nouvelle séance'} />
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

export default SessionForm;
