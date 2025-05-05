import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Alert,
  Paper,
  CircularProgress,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkIcon from '@mui/icons-material/Link';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import resourceTypeService from '../../services/resourceTypeService';
import ResourceDocumentLink from './ResourceDocumentLink'; // Importer le nouveau composant
import { saveViewPreference, getViewPreference } from '../../utils/userPreferences';

const ResourceList = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    // Récupérer la préférence utilisateur au démarrage ou utiliser 'grid' par défaut
    return getViewPreference('resources');
  }); 
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [resourceTypes, setResourceTypes] = useState({});
  const [resourceSubtypes, setResourceSubtypes] = useState({});
  const [loadingTypes, setLoadingTypes] = useState(false);
  const navigate = useNavigate();

  // Colonnes pour la DataGrid (vue tabulaire)
  const columns = [
    { 
      field: 'title', 
      headerName: 'Titre', 
      width: 200, 
      renderCell: (params) => (
        <span style={{ color: '#5a47d1', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/resources/${params.row.id}`)}>
          {params.value}
        </span>
      )
    },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 130,
      valueGetter: (params) => {
        // Priorité : resourceTypes du state, puis params.row.type, sinon vide
        return resourceTypes[params.row.type_id]?.value || params.row.type?.value || '';
      },
      valueFormatter: (params) => params.value ? (params.value.charAt(0).toUpperCase() + params.value.slice(1)) : 'Non spécifié'
    },
    {
      field: 'subtype',
      headerName: 'Sous-type',
      width: 130,
      valueGetter: (params) => {
        return resourceSubtypes[params.row.sub_type_id]?.value || params.row.sub_type?.value || '';
      },
      valueFormatter: (params) => params.value ? (params.value.charAt(0).toUpperCase() + params.value.slice(1)) : 'Non spécifié'
    },
    { 
      field: 'description', 
      headerName: 'Description', 
      width: 300,
      flex: 1 
    },
    {
      field: 'document',
      headerName: 'Document',
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: (params) => <ResourceDocumentLink resource={params.row} />
    },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 220, 
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" title="Voir" data-action="view" onClick={() => handleViewResource(params.row.id)}>
            <VisibilityIcon />
          </IconButton>
          <IconButton size="small" title="Modifier" data-action="edit" onClick={() => handleEditResource(params.row.id)}>
            <EditIcon />
          </IconButton>
          <IconButton size="small" title="Supprimer" color="error" data-action="delete" onClick={() => handleDeleteResource(params.row.id)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ];

  // Base URL pour l'API et les fichiers statiques du backend
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000'; // Fallback

  // Fonction de chargement des ressources
  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await api.get('/resources'); 
      setResources(response.data.items);
      
      // Récupérer les types et sous-types pour toutes les ressources
      await fetchResourceTypesInfo(response.data.items);
    } catch (err) {
      if (err.response && err.response.status !== 401) {
        console.error('Erreur lors du chargement des ressources:', err);
      }
      if (!err.response) {
         console.error('Erreur réseau ou autre lors du chargement des ressources:', err);
      }
      setResources([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour récupérer les informations de type et sous-type
  const fetchResourceTypesInfo = async (resourcesList) => {
    setLoadingTypes(true);
    
    try {
      // Récupérer tous les types
      const typesResponse = await resourceTypeService.getAllTypes();
      const typesMap = {};
      typesResponse.forEach(type => {
        typesMap[type.id] = type;
      });
      setResourceTypes(typesMap);
      
      // Récupérer tous les sous-types
      const subtypesResponse = await resourceTypeService.getAllSubtypes();
      const subtypesMap = {};
      subtypesResponse.forEach(subtype => {
        subtypesMap[subtype.id] = subtype;
      });
      setResourceSubtypes(subtypesMap);
    } catch (err) {
      console.error('Erreur lors du chargement des types de ressources:', err);
    } finally {
      setLoadingTypes(false);
    }
  };

  // Fonctions de gestion des ressources
  const handleCreateResource = () => {
    console.log('ResourceList: Début de la création de ressource');
    
    // Récupérer les données utilisateur depuis le localStorage
    const user = localStorage.getItem('user');
    console.log('ResourceList: Données brutes du localStorage:', user);
    
    const userData = user ? JSON.parse(user) : null;
    console.log('ResourceList: Données utilisateur après parsing:', userData);
    
    const userId = userData?.id;
    console.log('ResourceList: ID de l\'utilisateur trouvé:', userId);

    if (!userId) {
      console.error('ResourceList: ID utilisateur non défini');
      return;
    }

    // Redirection vers la page de création avec l'ID de l'utilisateur
    navigate(`/resources/new?userId=${userId}`);
    console.log('ResourceList: Redirection vers /resources/new avec userId:', userId);
  };

  const handleEditResource = (id) => {
    navigate(`/resources/edit/${id}`);
  };

  const handleViewResource = (id) => {
    navigate(`/resources/view/${id}`);
  };

  const handleDeleteResource = async (id) => {
    setResourceToDelete(id);
    setOpenConfirmDialog(true);
  };

  const confirmDelete = async () => {
    try {
      // Utiliser l'instance api importée.
      // Axios gère le baseURL et l'en-tête Authorization via l'intercepteur.
      const response = await api.delete(`/resources/${resourceToDelete}`); 
      
      // Recharger la liste après suppression
      fetchResources();
    } catch (err) {
      console.error('Erreur lors de la suppression de la ressource:', err);
    } finally {
      setOpenConfirmDialog(false);
      setResourceToDelete(null);
    }
  };

  const cancelDelete = () => {
    setOpenConfirmDialog(false);
    setResourceToDelete(null);
  };

  // Gérer le changement de mode d'affichage
  const handleViewModeChange = (event) => {
    const newMode = event.target.checked ? 'table' : 'grid';
    setViewMode(newMode);
    // Sauvegarder la préférence utilisateur
    saveViewPreference('resources', newMode);
  };

  // Effet de chargement initial
  useEffect(() => {
    fetchResources();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', p: { xs: 1, sm: 2, md: 3 }, minHeight: 'calc(100vh - 64px)' }}> 
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Typography variant="h6" component="h2">
              Mes Ressources
            </Typography>
          </Grid>
          <Grid item xs="auto">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateResource}
            >
              Nouvelle ressource
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
            />
          </Grid>
        </Grid>
      </Box>

      {viewMode === 'table' ? (
        <Paper sx={{ width: '100%', overflow: 'hidden', mb: 2 }}>
          <DataGrid
            rows={resources}
            columns={columns}
            autoHeight
            disableSelectionOnClick
            checkboxSelection={false}
            sx={{ border: 'none' }}
            getRowId={row => row.id}
            onCellClick={(params, event) => {
              // Désactiver la sélection, gérer la navigation via le titre ou les boutons actions
              if (params.field === 'title') {
                navigate(`/resources/${params.row.id}`);
              }
            }}
          />
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {resources.map((resource) => (
            <Grid item xs={12} sm={6} md={4} key={resource.id}>
              <Card>
                <CardHeader
                  title={<Typography variant="h6" sx={{ color: 'white' }}>{resource.title}</Typography>}
                  subheader={resource.description}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Type:</strong> {
                      loadingTypes ? "Chargement..." : 
                      resourceTypes[resource.type_id]?.value || 
                      resource.type?.value || 
                      'Non spécifié'
                    }
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Sous-type:</strong> {
                      loadingTypes ? "Chargement..." : 
                      resourceSubtypes[resource.sub_type_id]?.value || 
                      resource.sub_type?.value || 
                      'Non spécifié'
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                    {/* Utiliser le nouveau composant pour gérer le lien */}
                    <ResourceDocumentLink resource={resource} />
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        title="Voir" 
                        data-action="view"
                        onClick={() => handleViewResource(resource.id)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        title="Modifier" 
                        data-action="edit"
                        onClick={() => handleEditResource(resource.id)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        title="Supprimer" 
                        color="error"
                        data-action="delete"
                        onClick={() => handleDeleteResource(resource.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <Dialog
        open={openConfirmDialog}
        onClose={cancelDelete}
        aria-labelledby="confirm-delete-dialog-title"
      >
        <DialogTitle id="confirm-delete-dialog-title">
          Confirmation de suppression
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Êtes-vous sûr de vouloir supprimer cette ressource ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={cancelDelete} color="primary">
            Annuler
          </MuiButton>
          <MuiButton onClick={confirmDelete} color="error" variant="contained">
            Supprimer
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResourceList;
