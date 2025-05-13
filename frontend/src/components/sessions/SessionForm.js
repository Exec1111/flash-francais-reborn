import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import api from '../../services/api';
import ResourceSelectorModal from './ResourceSelectorModal';
import ObjectiveSelectorModal from '../sequences/ObjectiveSelectorModal'; // Importer la modale des objectifs
import { useTreeData } from '../../contexts/TreeDataContext';

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
    resource_ids: [] // Ajout pour les IDs des ressources
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { refreshTreeData } = useTreeData();
  const [availableResources, setAvailableResources] = useState([]); // Ajout pour les ressources disponibles
  const [selectedResources, setSelectedResources] = useState([]); // Ajout pour les ressources sélectionnées
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false); // État pour le modal
  const [selectedObjectives, setSelectedObjectives] = useState([]); // État pour les objectifs sélectionnés
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false); // État pour le modal objectifs

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
        resource_ids: initialData.resources ? initialData.resources.map(res => res.id) : [] // Ajout pour les IDs des ressources
        // Note: initialData ne contient pas directement objective_ids mais les objets objectives
      });
      // Initialiser les objectifs et ressources sélectionnés pour l'affichage des Chips
      if (initialData.objectives) {
        setSelectedObjectives(initialData.objectives);
      }
      if (initialData.resources) {
        setSelectedResources(initialData.resources);
      }
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
            // Assurer la conversion correcte de la date
            date: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            duration: data.duration ? (typeof data.duration === 'string' ? parseInt(data.duration.replace(/PT(\d+)M/, '$1')) : data.duration) : 60,
            sequence_id: data.sequence_id || null,
            resource_ids: data.resources ? data.resources.map(res => res.id) : [],
            // Note: objective_ids ne sont pas dans formData initialement mais gérés via selectedObjectives
          });
          // Initialiser les objectifs et ressources sélectionnés pour l'affichage des Chips
          if (data.objectives) {
            setSelectedObjectives(data.objectives);
          }
          if (data.resources) {
            setSelectedResources(data.resources);
          }

        } catch (err) {
          setError("Erreur lors du chargement de la séance: " + (err.response?.data?.detail || err.message || "Erreur inconnue"));
        }
      }
    };

    fetchSessionData();
  }, [isEdit, sessionId]);

  // Chargement des ressources disponibles
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/resources/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailableResources(response.data || []);
      } catch (err) {
        console.error('Erreur lors du chargement des ressources:', err);
      }
    };

    fetchResources();
  }, []);

  // --- Handlers ---

  // Gestion des changements dans les champs de formulaire
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Ouvrir le modal de sélection des ressources
  const handleOpenResourceModal = () => {
    setIsResourceModalOpen(true);
  };
  // Ouvrir le modal de sélection des objectifs
  const handleOpenObjectiveModal = () => {
    setIsObjectiveModalOpen(true);
  };

  // Fermer le modal et mettre à jour les ressources sélectionnées
  const handleSaveResources = (newSelection) => {
    setSelectedResources(newSelection);
    // Mettre à jour formData.resource_ids pour la soumission
    setFormData(prev => ({ ...prev, resource_ids: newSelection.map(res => res.id) }));
    setIsResourceModalOpen(false);
  };
  // Fermer le modal et mettre à jour les objectifs sélectionnés
  const handleSaveObjectives = (newSelection) => {
    setSelectedObjectives(newSelection);
    // Note: On ajoutera objective_ids au payload lors de la soumission, pas besoin de le stocker dans formData directement
    setIsObjectiveModalOpen(false);
  };

  // Supprimer une ressource de la sélection via le Chip
  const handleRemoveResource = (resourceToRemove) => {
    const newSelection = selectedResources.filter(res => res.id !== resourceToRemove.id);
    setSelectedResources(newSelection);
    // Mettre à jour formData.resource_ids
    setFormData(prev => ({ ...prev, resource_ids: newSelection.map(res => res.id) }));
  };
  // Supprimer un objectif de la sélection via le Chip
  const handleRemoveObjective = (objectiveToRemove) => {
    const newSelection = selectedObjectives.filter(obj => obj.id !== objectiveToRemove.id);
    setSelectedObjectives(newSelection);
    // Pas besoin de modifier formData ici
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    // Préparer les données pour l'API
    // Inclure les IDs des objectifs sélectionnés
    const sessionData = {
      ...formData,
      // Assurer que duration est un nombre entier
      duration: formData.duration ? parseInt(formData.duration, 10) : null,
      // Explicitement ajouter les IDs des objectifs sélectionnés
      objective_ids: selectedObjectives.map(obj => obj.id)
    };

    // Retirer les IDs si le champ n'est pas pertinent pour l'opération (ex: sequence_id si non défini)
    if (!sessionData.sequence_id) {
      delete sessionData.sequence_id; // Ou le mettre à null selon l'API
    }
    if (!sessionData.duration) {
      delete sessionData.duration; // Ou le mettre à null
    }

    // Valider la durée si nécessaire (doit être un entier)
    if (formData.duration && isNaN(sessionData.duration)) {
        setError("La durée doit être un nombre entier (en minutes).");
        setSubmitting(false);
        return;
    }

    try {
      const token = localStorage.getItem('token');
      let response;

      if (isEdit) {
        // Logique de mise à jour
        response = await api.put(`/sessions/${sessionId}`, sessionData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Séance modifiée avec succès !');
      } else {
        // Logique de création
        response = await api.post('/sessions/', sessionData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Séance créée avec succès !');
      }

      // Appeler la fonction de succès si fournie (utile en mode dialogue)
      if (onSuccess) {
        onSuccess(response.data); // Passer les données de la réponse
      }

      // Rafraîchir l'arbre si la fonction est disponible
      if (refreshTreeData) {
        await refreshTreeData();
      }

      // Gérer la fermeture ou la redirection
      if (isDialog) {
        // Si c'est un dialogue, ne pas rediriger mais fermer
        // La fermeture est gérée par `onSuccess` ou `onClose` dans le composant parent
      } else {
        // Rediriger vers la page de détail de la séance que l'on vient de modifier/créer
        if (isEdit) {
          // Si c'est une modification, rediriger vers la page de détail de la séance modifiée
          navigate(`/sessions/${sessionId}`);
        } else if (response && response.data && response.data.id) {
          // Si c'est une création, rediriger vers la page de détail de la nouvelle séance
          navigate(`/sessions/${response.data.id}`);
        } else if (formData.sequence_id) {
          // Fallback: rediriger vers la vue de la séquence parente si nécessaire
          navigate(`/sequences/${formData.sequence_id}`);
        } else {
          // Dernier recours: rediriger vers la liste des séances
          navigate('/sessions'); 
        }
      }

    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || (isEdit ? 'Erreur lors de la modification de la séance' : 'Erreur lors de la création de la séance');
      setError(errorMsg);
      console.error("Erreur handleSubmit SessionForm:", err.response || err);
    } finally {
      setSubmitting(false);
      // Ne pas fermer automatiquement le dialogue ici, laisser onSuccess/onClose gérer
    }
  };

  // --- Contenu du Formulaire --- 
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

        {/* Affichage des ressources sélectionnées et bouton d'ajout */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Ressources Associées</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
            {selectedResources.map((resource) => (
              <Chip
                key={resource.id}
                label={resource.title}
                onDelete={() => handleRemoveResource(resource)}
                deleteIcon={<CancelIcon onMouseDown={(event) => event.stopPropagation()} />}
                size="small"
              />
            ))}
          </Stack>
          <Button
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleOpenResourceModal}
            disabled={submitting}
            size="small"
          >
            Ajouter/Gérer les Ressources
          </Button>
        </Grid>

        {/* Affichage des objectifs sélectionnés et bouton d'ajout */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Objectifs Associés</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
            {selectedObjectives.map((objective) => (
              <Chip
                key={objective.id}
                label={objective.title}
                onDelete={() => handleRemoveObjective(objective)}
                deleteIcon={<CancelIcon onMouseDown={(event) => event.stopPropagation()} />}
                size="small"
              />
            ))}
          </Stack>
          <Button
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleOpenObjectiveModal}
            disabled={submitting}
            size="small"
          >
            Ajouter/Gérer les Objectifs
          </Button>
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
        {/* Modal de sélection des ressources */}
        <ResourceSelectorModal 
          open={isResourceModalOpen}
          onClose={() => setIsResourceModalOpen(false)}
          initialSelectedResources={selectedResources} // Passer les ressources déjà sélectionnées
          onSave={handleSaveResources} // Fonction pour récupérer la sélection finale
        />
        {/* Modal de sélection des objectifs */}
        <ObjectiveSelectorModal
          open={isObjectiveModalOpen}
          onClose={() => setIsObjectiveModalOpen(false)}
          initialSelectedObjectives={selectedObjectives} // Passer les objectifs déjà sélectionnés
          onSave={handleSaveObjectives} // Fonction pour récupérer la sélection finale
        />
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
      {/* Modal de sélection des ressources */}
      <ResourceSelectorModal 
        open={isResourceModalOpen}
        onClose={() => setIsResourceModalOpen(false)}
        initialSelectedResources={selectedResources} // Passer les ressources déjà sélectionnées
        onSave={handleSaveResources} // Fonction pour récupérer la sélection finale
      />
      {/* Modal de sélection des objectifs */}
      <ObjectiveSelectorModal
        open={isObjectiveModalOpen}
        onClose={() => setIsObjectiveModalOpen(false)}
        initialSelectedObjectives={selectedObjectives} // Passer les objectifs déjà sélectionnés
        onSave={handleSaveObjectives} // Fonction pour récupérer la sélection finale
      />
    </Box>
  );
};

export default SessionForm;
