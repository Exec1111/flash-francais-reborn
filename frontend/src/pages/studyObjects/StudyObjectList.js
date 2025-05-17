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
  Pagination,
  FormControlLabel,
  Switch,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  WarningAmber as WarningAmberIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import studyObjectService from '../../services/studyObjectService';
import resourceService from '../../services/resourceService';
import { saveViewPreference, getViewPreference } from '../../utils/userPreferences';
import paginationConfig from '../../config/pagination';

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
  const itemsPerPage = paginationConfig.studyObjects.itemsPerPage;

  // État pour le mode d'affichage
  const [viewMode, setViewMode] = useState(() => {
    // Récupérer la préférence utilisateur au démarrage
    return getViewPreference('studyObjects');
  });

  const navigate = useNavigate();

  // Charger la liste des objets d'étude et enrichir avec les titres des ressources
  const fetchStudyObjects = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * itemsPerPage;
      const response = await studyObjectService.getStudyObjects(skip, itemsPerPage);
      // Pour chaque objet, récupérer les titres des ressources associées
      const dataWithResources = await Promise.all(
        response.items.map(async (obj) => {
          let resourceTitles = [];
          try {
            const detail = await studyObjectService.getStudyObjectById(obj.id);
            if (detail.resource_ids && detail.resource_ids.length > 0) {
              // Récupérer les titres réels des ressources associées
              resourceTitles = await Promise.all(
                detail.resource_ids.map(async resId => {
                  try {
                    const resource = await resourceService.getResourceById(resId);
                    return resource.title || `Ressource ${resId}`;
                  } catch (e) {
                    console.error(`Erreur lors de la récupération de la ressource ${resId} pour la liste:`, e);
                    return `Ressource ${resId}`; // Titre par défaut en cas d'erreur
                  }
                })
              );
            }
          } catch (e) {
            console.error(`Erreur lors de la récupération des détails pour l'objet d'étude ${obj.id}:`, e);
            // Laisser resourceTitles vide ou avec une indication d'erreur si nécessaire
          }
          return { ...obj, resourceTitles };
        })
      );
      setStudyObjects(dataWithResources);
      setTotalPages(Math.ceil(response.total / itemsPerPage) || 1);
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

  // Gérer le changement de mode d'affichage
  const handleViewModeChange = (event) => {
    const newMode = event.target.checked ? 'table' : 'grid';
    setViewMode(newMode);
    // Sauvegarder la préférence utilisateur
    saveViewPreference('studyObjects', newMode);
  };

  return (
    // Appliquer le fond par défaut et padding
    <Box sx={{ bgcolor: 'background.default', p: { xs: 1, sm: 2, md: 3 }, minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs>
            <Typography variant="h6" component="h2">
              Objets d'étude
            </Typography>
          </Grid>
          <Grid item xs="auto">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateStudyObject}
            >
              Nouvel objet d'étude
            </Button>
          </Grid>
          <Grid item xs="auto">
            <FormControlLabel
              control={
                <Switch
                  checked={viewMode === 'table'}
                  onChange={handleViewModeChange}
                  name="viewMode"
                />
              }
              label={viewMode === 'table' ? "Vue Tabulaire" : "Vue en Fiches"}
              sx={{ ml: 1 }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Messages d'erreur */}
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

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Contenu conditionnel Table/Grid */}
      {viewMode === 'table' ? (
        // Vue table dans Paper avec fond papier
        <Paper sx={{ width: '100%', overflow: 'hidden', mb: 2, bgcolor: 'background.paper' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Titre</TableCell>
                  <TableCell>Ressources liées</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studyObjects.map((studyObject) => (
                  <TableRow key={studyObject.id}>
                    <TableCell style={{ cursor: 'pointer', color: '#5a47d1' }} onClick={() => navigate(`/study-objects/${studyObject.id}`)}>
                      {studyObject.title}
                    </TableCell>
                    <TableCell>
                      {Array.isArray(studyObject.resourceTitles) && studyObject.resourceTitles.length === 0 && (
                        <Tooltip title="Aucune ressource liée">
                          <WarningAmberIcon color="warning" />
                        </Tooltip>
                      )}
                      {Array.isArray(studyObject.resourceTitles) && studyObject.resourceTitles.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {studyObject.resourceTitles.map((title, idx) => (
                            <Typography key={idx} variant="body2" color="text.secondary">
                              {title}
                            </Typography>
                          ))}
                        </Box>
                      )}
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
        </Paper>
      ) : (
        // Vue en fiches directement sur fond background.default
        <Grid container spacing={3} sx={{ mb: 2 }}>
          {studyObjects.map((studyObject) => (
            <Grid item xs={12} sm={6} md={4} key={studyObject.id}>
              {/* Card individuelle pour chaque fiche */}
              <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    component="h2"
                    gutterBottom
                  >
                    {studyObject.title}
                  </Typography>

                  {/* Ressources liées */}
                  {Array.isArray(studyObject.resourceTitles) && studyObject.resourceTitles.length === 0 && (
                    <Tooltip title="Aucune ressource liée">
                      <WarningAmberIcon color="warning" sx={{ mb: 1 }} />
                    </Tooltip>
                  )}
                  {Array.isArray(studyObject.resourceTitles) && studyObject.resourceTitles.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
                      {studyObject.resourceTitles.map((title, idx) => (
                        <Typography key={idx} variant="body2" color="text.secondary">
                          {title}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Espace pour les actions en bas de la carte */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 1, borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
                    {/* Zone gauche pour les tags/infos supplémentaires si besoin */}
                    <Box sx={{ flexGrow: 1 }}>
                      {/* <Typography variant="caption">Infos</Typography> */}
                    </Box>
                    {/* Zone droite pour les boutons d'action */}
                    <Box>
                      <Tooltip title="Voir le détail">
                        <IconButton size="small" onClick={() => navigate(`/study-objects/${studyObject.id}`)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Éditer">
                        <IconButton size="small" onClick={() => handleEditStudyObject(studyObject.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(studyObject)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination centralisée en dehors des conditionnels */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, mb: 2 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange} 
            color="primary" 
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Affichage de {Math.min(itemsPerPage, studyObjects.length)} sur {(totalPages * itemsPerPage)} objets d'étude
          </Typography>
        </Box>
      )}

      {/* Dialogue de confirmation */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
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
