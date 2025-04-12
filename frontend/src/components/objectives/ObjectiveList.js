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
import objectiveService from '../../services/objectiveService';

const ObjectiveList = () => {
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // États pour le dialogue de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [objectiveToDelete, setObjectiveToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // États pour la pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  
  const navigate = useNavigate();

  // Charger la liste des objectifs
  const fetchObjectives = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * itemsPerPage;
      const data = await objectiveService.getObjectives(skip, itemsPerPage);
      setObjectives(data);
      // Dans un cas réel, le backend devrait renvoyer le nombre total d'éléments pour calculer le nombre de pages
      // Pour l'instant, on suppose que s'il y a moins d'éléments que itemsPerPage, c'est la dernière page
      setTotalPages(Math.ceil(data.length / itemsPerPage) || 1);
    } catch (err) {
      setError(`Erreur lors du chargement des objectifs : ${err.detail || err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjectives();
  }, [page]);

  // Ouvrir le dialogue de confirmation de suppression
  const handleOpenDeleteDialog = (objective) => {
    setObjectiveToDelete(objective);
    setDeleteDialogOpen(true);
  };

  // Fermer le dialogue de confirmation de suppression
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setObjectiveToDelete(null);
  };

  // Supprimer un objectif
  const handleDeleteObjective = async () => {
    if (!objectiveToDelete) return;
    
    setDeleting(true);
    try {
      await objectiveService.deleteObjective(objectiveToDelete.id);
      setSuccessMessage(`L'objectif "${objectiveToDelete.title}" a été supprimé avec succès.`);
      
      // Rafraîchir la liste des objectifs
      fetchObjectives();
    } catch (err) {
      setError(`Erreur lors de la suppression de l'objectif : ${err.detail || err.message || 'Erreur inconnue'}`);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setObjectiveToDelete(null);
    }
  };

  // Naviguer vers la page de création d'un nouvel objectif
  const handleCreateObjective = () => {
    navigate('/objectives/new');
  };

  // Naviguer vers la page d'édition d'un objectif
  const handleEditObjective = (id) => {
    navigate(`/objectives/edit/${id}`);
  };

  // Gérer le changement de page
  const handlePageChange = (event, value) => {
    setPage(value);
  };

  // Afficher un message de chargement
  if (loading && objectives.length === 0) {
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
              Objectifs pédagogiques
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateObjective}
            >
              Nouvel objectif
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

          {objectives.length === 0 ? (
            <Typography variant="body1" sx={{ my: 2, textAlign: 'center' }}>
              Aucun objectif pédagogique trouvé. Créez-en un nouveau pour commencer !
            </Typography>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Titre</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Séquences</TableCell>
                      <TableCell align="center">Séances</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {objectives.map((objective) => (
                      <TableRow key={objective.id}>
                        <TableCell>{objective.title}</TableCell>
                        <TableCell>
                          {objective.description ? (
                            objective.description.length > 100 
                              ? `${objective.description.substring(0, 100)}...` 
                              : objective.description
                          ) : (
                            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                              Pas de description
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {objective.sequences?.length || 0}
                        </TableCell>
                        <TableCell align="center">
                          {objective.sessions?.length || 0}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Tooltip title="Voir les détails">
                              <IconButton 
                                color="info"
                                onClick={() => {/* TODO: Implémenter la vue détaillée */}}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Modifier">
                              <IconButton 
                                color="primary"
                                onClick={() => handleEditObjective(objective.id)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <IconButton 
                                color="error"
                                onClick={() => handleOpenDeleteDialog(objective)}
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

              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={handlePageChange} 
                    color="primary" 
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogue de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l'objectif "{objectiveToDelete?.title}" ? 
            Cette action est irréversible et supprimera également toutes les associations 
            avec les séquences et séances.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary" disabled={deleting}>
            Annuler
          </Button>
          <Button 
            onClick={handleDeleteObjective} 
            color="error" 
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ObjectiveList;
