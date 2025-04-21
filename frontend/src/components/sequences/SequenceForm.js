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
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import sequenceService from '../../services/sequenceService';
import { useTreeData } from '../../contexts/TreeDataContext';
import ObjectiveSelectorModal from './ObjectiveSelectorModal';
import StudyObjectSelectorModal from './StudyObjectSelectorModal';

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
  
  // --- Nouveaux États pour la gestion des objectifs --- 
  const [selectedObjectives, setSelectedObjectives] = useState([]);
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  // --- Nouveaux États pour la gestion des objets d'étude ---
  const [selectedStudyObjects, setSelectedStudyObjects] = useState([]);
  const [isStudyObjectModalOpen, setIsStudyObjectModalOpen] = useState(false);
  // --- Fin des Nouveaux États ---
  
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
        description: initialData.description || '',
        progression_id: initialData.progression_id || progressionId || null,
      });
      // Initialiser les objectifs sélectionnés si disponibles
      if (Array.isArray(initialData.objectives)) {
        setSelectedObjectives(initialData.objectives);
      }
      // Initialiser les objets d'étude sélectionnés si disponibles
      if (Array.isArray(initialData.study_objects)) {
        setSelectedStudyObjects(initialData.study_objects);
      }
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
          // Pré-remplir les objectifs en mode édition (si l'API les renvoie)
          if (Array.isArray(data.objectives)) {
            setSelectedObjectives(data.objectives);
          } else {
            setSelectedObjectives([]);
          }
          // Pré-remplir les objets d'étude en mode édition (si l'API les renvoie)
          if (Array.isArray(data.study_objects)) {
            setSelectedStudyObjects(data.study_objects);
          } else {
            setSelectedStudyObjects([]);
          }
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

  // --- Nouveaux Handlers pour la modale Objectifs --- 
  const handleOpenObjectiveModal = () => {
    setIsObjectiveModalOpen(true);
  };

  const handleObjectiveSelectionSave = (newSelection) => {
    setSelectedObjectives(newSelection);
    setIsObjectiveModalOpen(false); // Fermer la modale après sauvegarde
  };

  // Supprimer un objectif de la sélection locale
  const handleRemoveObjective = (objectiveToRemove) => {
     setSelectedObjectives(prev => prev.filter(obj => obj.id !== objectiveToRemove.id));
  };
  // --- Fin Nouveaux Handlers ---

  // --- Handlers pour la modale d'objets d'étude ---
  const handleOpenStudyObjectModal = () => {
    if (!formData.progression_id) {
      setError("Impossible de sélectionner des objets d'étude tant que la progression parente n'est pas chargée.");
      return;
    }
    setIsStudyObjectModalOpen(true);
  };

  const handleStudyObjectSelectionSave = (newSelection) => {
    setSelectedStudyObjects(newSelection);
    setIsStudyObjectModalOpen(false);
  };

  const handleRemoveStudyObject = (studyObjectToRemove) => {
    setSelectedStudyObjects(prev => prev.filter(obj => obj.id !== studyObjectToRemove.id));
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
      
      // Ajouter les IDs des objectifs sélectionnés
      const objectiveIds = selectedObjectives.map(obj => obj.id);
      // Ajouter les IDs des objets d'étude sélectionnés
      const studyObjectIds = selectedStudyObjects.map(obj => obj.id);
      const finalSequenceData = {
        ...sequenceData,
        objective_ids: objectiveIds,
        study_object_ids: studyObjectIds,
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

        {/* --- Section Gestion des Objectifs --- */} 
        <Grid item xs={12}> 
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}> 
            Objectifs Associés ({selectedObjectives.length})
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleOpenObjectiveModal} 
            disabled={submitting}
            sx={{ mb: 1 }}
          >
            Gérer les Objectifs
          </Button>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedObjectives.length > 0 ? (
              selectedObjectives.map((objective) => (
                <Chip
                  key={objective.id}
                  label={objective.title}
                  onDelete={() => handleRemoveObjective(objective)}
                  disabled={submitting}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">Aucun objectif associé.</Typography>
            )}
          </Box>
        </Grid>
        {/* --- Fin Section Gestion des Objectifs --- */}

        {/* --- Section Gestion des Objets d'Étude --- */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>
            Objets d'étude associés ({selectedStudyObjects.length})
          </Typography>
          {process.env.NODE_ENV !== 'production' && (
            <Typography variant="caption" color="secondary">
              progression_id DEBUG: {String(formData.progression_id)}
            </Typography>
          )}
          <Button
            variant="outlined"
            onClick={handleOpenStudyObjectModal}
            disabled={submitting || !formData.progression_id}
            sx={{ mb: 1 }}
          >
            Gérer les objets d'étude
          </Button>
          {!formData.progression_id && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Progression parente en cours de chargement ou non définie pour cette séquence.<br/>
              Veuillez vérifier que la séquence est bien rattachée à une progression.
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedStudyObjects.length > 0 ? (
              selectedStudyObjects.map((obj) => (
                <Chip
                  key={obj.id}
                  label={obj.title}
                  onDelete={() => handleRemoveStudyObject(obj)}
                  disabled={submitting}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">Aucun objet d'étude associé.</Typography>
            )}
          </Box>
        </Grid>
        {/* --- Fin Section Gestion des Objets d'Étude --- */}

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

      {/* Instanciation de la modale Objectifs */}
      <ObjectiveSelectorModal 
        open={isObjectiveModalOpen}
        onClose={() => setIsObjectiveModalOpen(false)}
        initialSelectedObjectives={selectedObjectives}
        onSave={handleObjectiveSelectionSave}
      />
      {/* Instanciation de la modale Objets d'étude */}
      <StudyObjectSelectorModal
        open={isStudyObjectModalOpen}
        onClose={() => setIsStudyObjectModalOpen(false)}
        initialSelectedStudyObjects={selectedStudyObjects}
        onSave={handleStudyObjectSelectionSave}
        progressionId={formData.progression_id}
      />
    </Box>
  );
};

export default SequenceForm;
