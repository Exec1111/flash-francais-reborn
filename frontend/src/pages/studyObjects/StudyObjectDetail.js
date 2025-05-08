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
import studyObjectService from '../../services/studyObjectService';
import progressionService from '../../services/progressionService';

const StudyObjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [studyObject, setStudyObject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progressions, setProgressions] = useState([]);
  const [resources, setResources] = useState([]);
  const [loadingAssociations, setLoadingAssociations] = useState(false);

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
        if (data.resource_ids && data.resource_ids.length > 0) {
          // Même approche pour les ressources (optionnel)
          const fakeResources = data.resource_ids.map(resId => ({
            id: resId,
            title: `Contenu pédagogique`,
            type: "Exercice",
            subtype: "Vocabulaire"
          }));
          setResources(fakeResources);
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
                color="primary"
                onClick={() => navigate(`/study-objects/${id}/propose-works`, { state: { title: studyObject.title } })}
                sx={{ mr: 1 }}
              >
                Proposer des œuvres
              </Button>
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

          <Typography variant="h6" gutterBottom>
            Ressources liées
          </Typography>
          {studyObject.resource_ids && studyObject.resource_ids.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {resources.map((resource) => (
                <Chip
                  key={resource.id}
                  label={resource.title}
                  onClick={() => navigate(`/resources/view/${resource.id}`)}
                  title={`Type: ${resource.type}, Sous-type: ${resource.subtype}`}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucune ressource n'est associée à cet objet d'étude pour le moment.
            </Typography>
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
    </Container>
  );
};

export default StudyObjectDetail;
