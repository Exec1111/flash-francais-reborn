import React, { useState, useEffect, useRef } from 'react';
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
  Pagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkIcon from '@mui/icons-material/Link';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api, { API_BASE_URL } from '../../services/api';
import resourceService from '../../services/resourceService';
import resourceTypeService from '../../services/resourceTypeService';
import ResourceDocumentLink from './ResourceDocumentLink';
import { saveViewPreference, getViewPreference } from '../../utils/userPreferences';
import paginationConfig from '../../config/pagination';
import PdfExtractionStatusChip from '../pdf/PdfExtractionStatusChip';

const ResourceList = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    return getViewPreference('resources');
  }); 
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [resourceTypes, setResourceTypes] = useState({});
  const [resourceSubtypes, setResourceSubtypes] = useState({});
  const [loadingTypes, setLoadingTypes] = useState(false);
  // États pour la pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedSubTypeId, setSelectedSubTypeId] = useState('');
  const [typeOptions, setTypeOptions] = useState([]);
  const [subTypeOptions, setSubTypeOptions] = useState([]);
  const [filteredSubTypeOptions, setFilteredSubTypeOptions] = useState([]);
  const [totalResources, setTotalResources] = useState(0);
  const itemsPerPage = paginationConfig.resources.itemsPerPage;
  const navigate = useNavigate();
  const debounceTimer = useRef(null);

  // Colonnes pour la DataGrid (vue tabulaire)
  const columns = [
    { 
      field: 'title', 
      headerName: 'Titre', 
      width: 200, 
      renderCell: (params) => (
        <span style={{ color: '#5a47d1', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/resources/view/${params.row.id}`)}>
          {params.value}
        </span>
      )
    },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 130,
      valueGetter: (params) => {
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
      field: 'docling',
      headerName: 'Extraction PDF',
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <PdfExtractionStatusChip
          resourceId={params.row.id}
          fileType={params.row.file_type}
          filePath={params.row.file_path}
          autoFetch
        />
      )
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
          <IconButton size="small" title="Modifier" data-action="edit" onClick={(event) => {
            event.stopPropagation();
            handleEditResource(params.row.id);
          }}>
            <EditIcon />
          </IconButton>
          <IconButton size="small" title="Supprimer" color="error" data-action="delete" onClick={() => handleDeleteResource(params.row.id)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ];

  // Fonction de chargement des ressources avec pagination
  const fetchResources = async (currentPage = 1, search = searchTerm, typeId = selectedTypeId, subTypeId = selectedSubTypeId) => {
    setLoading(true);
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const params = {
        skip: skip,
        limit: itemsPerPage,
      };
      if (search) {
        params.search = search;
      }
      if (typeId) {
        params.typeId = typeId;
      }
      if (subTypeId) {
        params.subTypeId = subTypeId;
      }
      const response = await resourceService.getAll(params);
      
      // Mise à jour des ressources et des informations de pagination
      setResources(response.items || []);
      setTotalResources(response.total || 0);
      setTotalPages(Math.ceil(response.total / itemsPerPage) || 1);
      
      // Récupérer les types et sous-types pour toutes les ressources
      // await fetchResourceTypesInfo(response.items); // This line was problematic as fetchResourceTypesInfo no longer takes arguments
      // Types and subtypes are fetched independently now in useEffect.
    } catch (err) {
      console.error('Erreur lors du chargement des ressources:', err);
      setResources([]);
      setTotalPages(1);
      setTotalResources(0);
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire de changement de page
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    fetchResources(newPage, searchTerm, selectedTypeId, selectedSubTypeId);
    window.scrollTo(0, 0);
  };
  
  // Fonction pour récupérer les informations de type et sous-type
  const fetchResourceTypesInfo = async () => { // Removed resourcesList parameter
    setLoadingTypes(true);
    
    try {
      // Récupérer tous les types
      const typesServiceResponse = await resourceTypeService.getAllTypes();
      const typesData = typesServiceResponse.data || typesServiceResponse; // Adapt based on actual service response structure
      const typesMap = {};
      // Assuming typesData is an array
      (typesData || []).forEach(type => {
        typesMap[type.id] = type;
      });
      setResourceTypes(typesMap);
      const typesForSelect = (typesData || []).map(type => ({ id: type.id, value: type.value, key: type.key || type.id.toString() }));
      setTypeOptions(typesForSelect);
      
      // Récupérer tous les sous-types
      const subtypesServiceResponse = await resourceTypeService.getAllSubtypes();
      const subtypesData = subtypesServiceResponse.data || subtypesServiceResponse; // Adapt based on actual service response structure
      const subtypesMap = {};
      // Assuming subtypesData is an array
      (subtypesData || []).forEach(subtype => {
        subtypesMap[subtype.id] = subtype;
      });
      setResourceSubtypes(subtypesMap);
      const subtypesForSelect = (subtypesData || []).map(subtype => ({ id: subtype.id, value: subtype.value, key: subtype.key || subtype.id.toString(), typeId: subtype.type_id }));
      setSubTypeOptions(subtypesForSelect);

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
    
    console.log('ResourceList: Redirection vers /resources/new avec userId:', userId);
    navigate('/resources/new', { state: { userId } });
  };

  const handleViewResource = (id) => {
    navigate(`/resources/view/${id}`);
  };

  const handleEditResource = (id) => {
    console.log('Calling handleEditResource with id:', id, 'and navigating to:', `/resources/edit/${id}`); // Corrected path
    navigate(`/resources/edit/${id}`); // Corrected path
  };

  const handleDeleteResource = (id) => {
    setResourceToDelete(id);
    setOpenConfirmDialog(true);
  };

  const confirmDelete = async () => {
    try {
      await resourceService.delete(resourceToDelete);
      // Recharger la liste après suppression (rester sur la même page sauf si c'était le dernier élément de la page)
      const newTotalPages = Math.ceil((totalResources - 1) / itemsPerPage);
      const newPage = page > newTotalPages ? newTotalPages || 1 : page;
      fetchResources(newPage);
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

  // --- Gestionnaires pour les filtres ---
  const handleSearchChange = (event) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);

    // Utiliser un timer pour ne pas envoyer une requête à chaque frappe
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      // Passer directement la nouvelle valeur de recherche pour éviter le décalage des états asynchrones
      fetchResources(1, newSearchTerm, selectedTypeId, selectedSubTypeId);
    }, 500);
  };

  const handleTypeChange = (event) => {
    const newTypeId = event.target.value;
    setSelectedTypeId(newTypeId);
    setSelectedSubTypeId(''); // Réinitialiser le sous-type car les options vont changer
    setPage(1);
    // Passer directement la nouvelle valeur du type pour éviter le décalage des états asynchrones
    fetchResources(1, searchTerm, newTypeId, '');
  };

  const handleSubTypeChange = (event) => {
    const newSubTypeId = event.target.value;
    setSelectedSubTypeId(newSubTypeId);
    setPage(1);
    // Passer directement la nouvelle valeur du sous-type pour éviter le décalage des états asynchrones
    fetchResources(1, searchTerm, selectedTypeId, newSubTypeId);
  };

  // Effet pour filtrer les sous-types lorsque le type sélectionné change
  useEffect(() => {
    if (selectedTypeId) {
      setFilteredSubTypeOptions(
        subTypeOptions.filter(subType => subType.typeId === selectedTypeId)
      );
    } else {
      // Afficher tous les sous-types si aucun type n'est sélectionné,
      // ou une liste vide si subTypeOptions est vide.
      setFilteredSubTypeOptions(subTypeOptions);
    }
  }, [selectedTypeId, subTypeOptions]);

  // Effet de chargement initial
  useEffect(() => {
    fetchResources(page); // Utilise la page actuelle (initialement 1)
    fetchResourceTypesInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dépendances vides pour exécution unique au montage

  // Effet pour recharger les données lorsque la page change (déjà géré par handlePageChange)
  // Mais on peut aussi écouter `page` si on veut séparer la logique de chargement initial
  // useEffect(() => {
  //   fetchResources(page);
  // }, [page]); // Attention, cela pourrait causer un double chargement au montage si fetchResources(page) est déjà dans l'effet de montage.

  if (loading && resources.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', p: { xs: 1, sm: 2, md: 3 }, minHeight: 'calc(100vh - 64px)' }}>
      {/* Section des filtres */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom component="div">
          Filtres
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Libellé"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={selectedTypeId}
                onChange={handleTypeChange}
                label="Type"
              >
                <MenuItem value="">
                  <em>Tous les types</em>
                </MenuItem>
                {typeOptions.map((type) => (
                  <MenuItem key={type.key || type.id} value={type.id}>
                    {type.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth variant="outlined" size="small" disabled={!selectedTypeId && filteredSubTypeOptions.length === 0}>
              <InputLabel>Sous-type</InputLabel>
              <Select
                value={selectedSubTypeId}
                onChange={handleSubTypeChange}
                label="Sous-type"
              >
                <MenuItem value="">
                  <em>Tous les sous-types</em>
                </MenuItem>
                {filteredSubTypeOptions.map((subType) => (
                  <MenuItem key={subType.key || subType.id} value={subType.id}>
                    {subType.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

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
        <>
          <Paper sx={{ width: '100%', overflow: 'hidden', mb: 2 }}>
            <DataGrid
              rows={resources}
              columns={columns}
              autoHeight
              disableSelectionOnClick
              checkboxSelection={false}
              sx={{ border: 'none' }}
              getRowId={row => row.id}
              pageSize={itemsPerPage}
              rowCount={totalResources}
              paginationMode="server"
              page={page - 1} // DataGrid utilise un index zéro-based
              onPageChange={(newPage) => handlePageChange(null, newPage + 1)}
              onCellClick={(params, event) => {
                // Désactiver la sélection, gérer la navigation via le titre ou les boutons actions
                // The following problematic navigation has been removed:
                // if (params.field === 'title') {
                //   navigate(`/resources/${params.row.id}`);
                // }
              }}
            />
          </Paper>

        </>
      ) : (
        // Mode grille
        <>
          {resources.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Aucune ressource trouvée.
            </Alert>
          ) : (
            <>
              <Grid container spacing={3}>
                {resources.map((resource) => (
                  <Grid item xs={12} sm={6} md={4} key={resource.id}>
                    <Card 
                      sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        '&:hover': { boxShadow: 6 } 
                      }}
                    >
                      <CardHeader 
                        title={resource.title} 
                        titleTypographyProps={{
                          variant: 'h6',
                          fontWeight: 'bold',
                          color: 'primary.main',
                          sx: { cursor: 'pointer' }
                        }}
                        sx={{ pb: 0 }}
                        onClick={(event) => {
                          event.stopPropagation(); // Prevent event bubbling
                          console.log('Navigating to resource view from CardHeader, resource.id:', resource.id);
                          navigate(`/resources/view/${resource.id}`);
                        }}
                      />
                      <CardContent sx={{ pt: 1, pb: 1, flex: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Type: {resourceTypes[resource.type_id]?.value || 'Non spécifié'}
                        </Typography>
                        {resource.sub_type_id && (
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Sous-type: {resourceSubtypes[resource.sub_type_id]?.value || 'Non spécifié'}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {resource.description || 'Aucune description disponible.'}
                        </Typography>
                        <Box sx={{ mt: 'auto', pt: 2 }}>
                          <ResourceDocumentLink resource={resource} />
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <PdfExtractionStatusChip
                            resourceId={resource.id}
                            fileType={resource.file_type}
                            filePath={resource.file_path}
                            autoFetch
                          />
                        </Box>
                      </CardContent>
                      <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                          <IconButton size="small" title="Voir" onClick={() => handleViewResource(resource.id)}>
                            <VisibilityIcon />
                          </IconButton>
                          <IconButton size="small" title="Modifier" onClick={(event) => {
                            event.stopPropagation();
                            handleEditResource(resource.id);
                          }}>
                            <EditIcon />
                          </IconButton>
                        </Box>
                        <IconButton size="small" title="Supprimer" color="error" onClick={() => handleDeleteResource(resource.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              

            </>
          )}
        </>
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
            Affichage de {Math.min(itemsPerPage, resources.length)} sur {totalResources} ressources
          </Typography>
        </Box>
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