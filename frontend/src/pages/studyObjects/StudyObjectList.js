import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  Pagination
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import studyObjectService from '../../services/studyObjectService';

const StudyObjectList = () => {
  const [studyObjects, setStudyObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // États pour le dialogue de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studyObjectToDelete, setStudyObjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // États pour la pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const navigate = useNavigate();

  // Charger la liste des objets d'étude
  const fetchStudyObjects = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * itemsPerPage;
      const data = await studyObjectService.getStudyObjects(skip, itemsPerPage);
      setStudyObjects(data);
      setTotalPages(Math.ceil(data.length / itemsPerPage) || 1);
    } catch (err) {
      setError(`Erreur lors du chargement des objets d'étude : ${err.detail || err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyObjects();
    // eslint-disable-next-line
  }, [page]);

  // Ouvrir le dialogue de confirmation de suppression
  const handleOpenDeleteDialog = (studyObject) => {
    setStudyObjectToDelete(studyObject);
    setDeleteDialogOpen(true);
  };

  // Fermer le dialogue de confirmation de suppression
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setStudyObjectToDelete(null);
  };

  // Supprimer un objet d'étude
  const handleDeleteStudyObject = async () => {
    if (!studyObjectToDelete) return;
    setDeleting(true);
    try {
      await studyObjectService.deleteStudyObject(studyObjectToDelete.id);
      setSuccessMessage(`L'objet d'étude "${studyObjectToDelete.title}" a été supprimé avec succès.`);
      fetchStudyObjects();
    } catch (err) {
      setError(`Erreur lors de la suppression de l'objet d'étude : ${err.detail || err.message || 'Erreur inconnue'}`);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setStudyObjectToDelete(null);
    }
  };

  // Naviguer vers la page de création d'un nouvel objet d'étude
  const handleCreateStudyObject = () => {
    navigate('/study-objects/new');
  };

  // Naviguer vers la page d'édition d'un objet d'étude
  const handleEditStudyObject = (id) => {
    navigate(`/study-objects/edit/${id}`);
  };

  // Gérer le changement de page
  const handlePageChange = (event, value) => {
    setPage(value);
  };

  if (loading && studyObjects.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2">
              Objets d'étude
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateStudyObject}
            >
              Nouvel objet d'étude
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}

          {studyObjects.length === 0 ? (
            <Typography variant="body1" sx={{ my: 2, textAlign: 'center' }}>
              Aucun objet d'étude trouvé. Créez-en un nouveau pour commencer !
            </Typography>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Titre</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Progressions</TableCell>
                      <TableCell align="center">Ressources</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {studyObjects.map((studyObject) => (
                      <TableRow key={studyObject.id}>
                        <TableCell>{studyObject.title}</TableCell>
                        <TableCell>
                          {studyObject.description ? (
                            studyObject.description.length > 100
                              ? `${studyObject.description.substring(0, 100)}...`
                              : studyObject.description
                          ) : (
                            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                              Pas de description
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {studyObject.progression_ids?.length || 0}
                        </TableCell>
                        <TableCell align="center">
                          {studyObject.resource_ids?.length || 0}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Tooltip title="Voir les détails">
                              <IconButton
                                color="primary"
                                onClick={() => navigate(`/study-objects/${studyObject.id}`)}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Éditer">
                              <IconButton
                                color="secondary"
                                onClick={() => handleEditStudyObject(studyObject.id)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <IconButton
                                color="error"
                                onClick={() => handleOpenDeleteDialog(studyObject)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer cet objet d'étude ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting}>Annuler</Button>
          <Button onClick={handleDeleteStudyObject} color="error" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudyObjectList;
