import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  Divider,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Grid
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import studyObjectService from '../../services/studyObjectService';
import progressionService from '../../services/progressionService';
import oeuvreService from '../../services/oeuvreService';
import OeuvreSelectorModal from '../../components/oeuvres/OeuvreSelectorModal';

const StudyObjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [studyObject, setStudyObject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progressions, setProgressions] = useState([]);
  const [oeuvres, setOeuvres] = useState([]);
  const [loadingAssociations, setLoadingAssociations] = useState(false);
  const [oeuvreModalOpen, setOeuvreModalOpen] = useState(false);

  useEffect(() => {
    const fetchStudyObject = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await studyObjectService.getStudyObjectById(id);
        setStudyObject(data);
        // Récupérer les titres réels des progressions associées
        if (data.progression_ids && data.progression_ids.length > 0) {
          // Appels parallèles pour récupérer chaque progression
          const progs = await Promise.all(
            data.progression_ids.map(async progId => {
              try {
                const prog = await progressionService.getProgressionById(progId);
                return { id: progId, title: prog.title || `Progression ${progId}` };
              } catch (e) {
                return { id: progId, title: `Progression ${progId}` };
              }
            })
          );
          setProgressions(progs);
        }
        // Récupérer les œuvres liées à cet objet d'étude
        if (data.oeuvres && data.oeuvres.length > 0) {
          setOeuvres(data.oeuvres);
        }
      } catch (err) {
        setError(err.detail || err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    fetchStudyObject();
  }, [id]);

  const handleEdit = () => {
    navigate(`/study-objects/edit/${id}`);
  };

  const handleOpenDeleteDialog = () => setDeleteDialogOpen(true);
  const handleCloseDeleteDialog = () => setDeleteDialogOpen(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await studyObjectService.deleteStudyObject(id);
      navigate('/study-objects');
    } catch (err) {
      setError(err.detail || err.message || 'Erreur inconnue');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleOeuvreSelection = async (selectedOeuvres) => {
    try {
      setLoadingAssociations(true);
      // Mettre à jour les œuvres liées à l'objet d'étude
      const oeuvreIds = selectedOeuvres.map(oeuvre => oeuvre.id);
      await studyObjectService.updateStudyObject(id, { oeuvre_ids: oeuvreIds });
      
      // Recharger les données
      const updatedData = await studyObjectService.getStudyObjectById(id);
      setStudyObject(updatedData);
      if (updatedData.oeuvres) {
        setOeuvres(updatedData.oeuvres);
      }
      setOeuvreModalOpen(false);
    } catch (err) {
      setError(err.detail || err.message || 'Erreur lors de la mise à jour des œuvres');
    } finally {
      setLoadingAssociations(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!studyObject) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">Objet d'étude non trouvé</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {studyObject.title}
            </Typography>
            <Box>
              <Button 
                variant="contained" 
                startIcon={<EditIcon />} 
                onClick={handleEdit}
                sx={{ mr: 1 }}
              >
                Modifier
              </Button>
              <IconButton color="error" onClick={handleOpenDeleteDialog}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>

          <Typography variant="body1" color="text.secondary" paragraph>
            {studyObject.description || 'Aucune description disponible.'}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Progressions associées
          </Typography>
          {studyObject.progression_ids && studyObject.progression_ids.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {progressions.map((progression) => (
                <Chip
                  key={progression.id}
                  label={progression.title}
                  onClick={() => navigate(`/progressions/${progression.id}`)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucune progression n'est associée à cet objet d'étude pour le moment.
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="h6" gutterBottom>
              Œuvres
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => navigate('/oeuvres/wizard', { state: { fromStudyObject: { id: studyObject.id, title: studyObject.title, description: studyObject.description } } })}
            >
              Proposer avec l'IA
            </Button>
            <Button 
              variant="outlined"
                onClick={() => setOeuvreModalOpen(true)}
                sx={{ mr: 1 }}
                disabled={loadingAssociations}
              >
                Rattacher/détacher
              </Button>
          </Box>
          {(!oeuvres || oeuvres.length === 0) && (
            <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
              Aucune œuvre n'est actuellement liée à cet objet d'étude. Il est recommandé d'associer des œuvres pour une expérience pédagogique complète.
            </Alert>
          )}
          {oeuvres && oeuvres.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {oeuvres.map((oeuvre) => (
                <Chip
                  key={oeuvre.id}
                  label={oeuvre.titre}
                  onClick={() => navigate(`/oeuvres/${oeuvre.id}`)}
                  title={`${oeuvre.auteur_complet} - ${oeuvre.type}`}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer cet objet d'étude ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting}>Annuler</Button>
          <Button onClick={handleDelete} color="error" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      <OeuvreSelectorModal
        open={oeuvreModalOpen}
        onClose={() => setOeuvreModalOpen(false)}
        onSelect={handleOeuvreSelection}
        selectedOeuvres={oeuvres}
        multiSelect={true}
        title="Sélectionner les œuvres pour cet objet d'étude"
      />
    </Container>
  );
};

export default StudyObjectDetail;
