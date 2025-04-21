import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
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
  DialogActions
} from '@mui/material';
import studyObjectService from '../../services/studyObjectService';

const StudyObjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [studyObject, setStudyObject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchStudyObject = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await studyObjectService.getStudyObjectById(id);
        setStudyObject(data);
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
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 4 }}>
        {error}
      </Alert>
    );
  }

  if (!studyObject) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Détail de l'objet d'étude
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            <b>Titre :</b> {studyObject.title}
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            <b>Description :</b> {studyObject.description || <span style={{fontStyle: 'italic', color: '#888'}}>Pas de description</span>}
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            <b>Progressions associées :</b> {studyObject.progression_ids?.length || 0}
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            <b>Ressources associées :</b> {studyObject.resource_ids?.length || 0}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button variant="contained" color="primary" onClick={handleEdit}>
              Éditer
            </Button>
            <Button variant="outlined" color="error" onClick={handleOpenDeleteDialog}>
              Supprimer
            </Button>
            <Button variant="outlined" sx={{ ml: 2 }} onClick={() => navigate('/study-objects')}>
              Retour à la liste
            </Button>
          </Box>
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
    </Box>
  );
};

export default StudyObjectDetail;
