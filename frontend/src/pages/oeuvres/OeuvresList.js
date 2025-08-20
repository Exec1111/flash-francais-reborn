import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import oeuvreService from '../../services/oeuvreService';
import { saveViewPreference, getViewPreference } from '../../utils/userPreferences';

const OeuvresList = () => {
  const navigate = useNavigate();
  const [oeuvres, setOeuvres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [publicOnly, setPublicOnly] = useState(false);
  const [typesDisponibles, setTypesDisponibles] = useState([]);
  const [genresDisponibles, setGenresDisponibles] = useState([]);
  
  // État pour le mode d'affichage
  const [viewMode, setViewMode] = useState(() => {
    return getViewPreference('oeuvres') || 'grid';
  });

  const itemsPerPage = 12;

  // Charger les œuvres
  const loadOeuvres = async () => {
    try {
      setLoading(true);
      const params = {
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        search: searchTerm,
        type_filter: typeFilter,
        genre_filter: genreFilter,
        public_only: publicOnly
      };

      const response = await oeuvreService.getOeuvres(params);
      setOeuvres(response.items);
      setTotalPages(Math.ceil(response.total / itemsPerPage));
    } catch (err) {
      setError('Erreur lors du chargement des œuvres');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Charger les métadonnées (types et genres)
  const loadMetadata = async () => {
    try {
      const [types, genres] = await Promise.all([
        oeuvreService.getTypesOeuvres(),
        oeuvreService.getGenresOeuvres()
      ]);
      setTypesDisponibles(types);
      setGenresDisponibles(genres);
    } catch (err) {
      console.error('Erreur lors du chargement des métadonnées:', err);
    }
  };

  // Charger les données au montage et lors des changements de filtres
  useEffect(() => {
    loadOeuvres();
  }, [currentPage, searchTerm, typeFilter, genreFilter, publicOnly]);

  useEffect(() => {
    loadMetadata();
  }, []);

  // Gérer la recherche
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Gérer le changement de page
  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  // Supprimer une œuvre
  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette œuvre ?')) {
      try {
        await oeuvreService.deleteOeuvre(id);
        loadOeuvres();
      } catch (err) {
        setError('Erreur lors de la suppression de l\'œuvre');
        console.error(err);
      }
    }
  };

  // Formater l'affichage de l'auteur
  const formatAuteur = (auteur) => {
    if (!auteur) return 'Auteur inconnu';
    const { prenom, nom } = auteur;
    if (prenom && nom) return `${prenom} ${nom}`;
    return nom || prenom || 'Auteur inconnu';
  };

  // Gérer le changement de mode d'affichage
  const handleViewModeChange = (event) => {
    const newMode = event.target.checked ? 'table' : 'grid';
    setViewMode(newMode);
    saveViewPreference('oeuvres', newMode);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Œuvres littéraires
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={viewMode === 'table'}
                onChange={handleViewModeChange}
                name="viewMode"
              />
            }
            label={viewMode === 'table' ? "Vue en Liste" : "Vue en Fiches"}
          />
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => navigate('/oeuvres/generate')}
          >
            Générer par IA
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/oeuvres/new')}
          >
            Nouvelle œuvre
          </Button>
        </Box>
      </Box>

      {/* Filtres */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Rechercher"
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                label="Type"
              >
                <MenuItem value="">Tous les types</MenuItem>
                {typesDisponibles.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Genre</InputLabel>
              <Select
                value={genreFilter}
                onChange={(e) => {
                  setGenreFilter(e.target.value);
                  setCurrentPage(1);
                }}
                label="Genre"
              >
                <MenuItem value="">Tous les genres</MenuItem>
                {genresDisponibles.map((genre) => (
                  <MenuItem key={genre} value={genre}>
                    {genre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Visibilité</InputLabel>
              <Select
                value={publicOnly}
                onChange={(e) => {
                  setPublicOnly(e.target.value);
                  setCurrentPage(1);
                }}
                label="Visibilité"
              >
                <MenuItem value={false}>Toutes</MenuItem>
                <MenuItem value={true}>Publiques uniquement</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {oeuvres.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Aucune œuvre trouvée
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {searchTerm || typeFilter || genreFilter
                  ? 'Essayez de modifier vos critères de recherche'
                  : 'Commencez par créer votre première œuvre'}
              </Typography>
            </Box>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <Grid container spacing={3}>
                  {oeuvres.map((oeuvre) => (
                    <Grid item xs={12} sm={6} md={4} key={oeuvre.id}>
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" component="h2" gutterBottom noWrap>
                            {oeuvre.titre}
                          </Typography>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            {formatAuteur(oeuvre.auteur)}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={oeuvre.type}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            {oeuvre.genre && (
                              <Chip
                                label={oeuvre.genre}
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                            {oeuvre.extrait && (
                              <Chip
                                label="Extrait"
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            )}
                            {oeuvre.is_public && (
                              <Chip
                                label="Public"
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            )}
                          </Box>
                          {oeuvre.date_publication && (
                            <Typography variant="body2" color="text.secondary">
                              Publié en {oeuvre.date_publication}
                            </Typography>
                          )}
                          {oeuvre.tags && oeuvre.tags.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              {oeuvre.tags.slice(0, 3).map((tag, index) => (
                                <Chip
                                  key={index}
                                  label={tag}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))}
                              {oeuvre.tags.length > 3 && (
                                <Typography variant="caption" color="text.secondary">
                                  +{oeuvre.tags.length - 3} autres
                                </Typography>
                              )}
                            </Box>
                          )}
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                          <Button
                            size="small"
                            onClick={() => navigate(`/oeuvres/${oeuvre.id}`)}
                          >
                            Voir détails
                          </Button>
                          <Box>
                            <Tooltip title="Modifier">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/oeuvres/edit/${oeuvre.id}`)}
                                disabled={oeuvre.is_public}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(oeuvre.id)}
                                disabled={oeuvre.is_public}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Titre</TableCell>
                          <TableCell>Auteur</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Genre</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Tags</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {oeuvres.map((oeuvre) => (
                          <TableRow key={oeuvre.id} hover>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                                {oeuvre.titre}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                {oeuvre.extrait && (
                                  <Chip label="Extrait" size="small" color="info" variant="outlined" />
                                )}
                                {oeuvre.is_public && (
                                  <Chip label="Public" size="small" color="success" variant="outlined" />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatAuteur(oeuvre.auteur)}
                              </Typography>
                              {oeuvre.auteur?.nationalite && (
                                <Typography variant="caption" color="text.secondary">
                                  {oeuvre.auteur.nationalite}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={oeuvre.type}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {oeuvre.genre && (
                                <Chip
                                  label={oeuvre.genre}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {oeuvre.date_publication && (
                                <Typography variant="body2">
                                  {oeuvre.date_publication}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {oeuvre.tags && oeuvre.tags.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {oeuvre.tags.slice(0, 2).map((tag, index) => (
                                    <Chip
                                      key={index}
                                      label={tag}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ))}
                                  {oeuvre.tags.length > 2 && (
                                    <Typography variant="caption" color="text.secondary">
                                      +{oeuvre.tags.length - 2}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                <Tooltip title="Voir détails">
                                  <IconButton
                                    size="small"
                                    onClick={() => navigate(`/oeuvres/${oeuvre.id}`)}
                                  >
                                    <SearchIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Modifier">
                                  <IconButton
                                    size="small"
                                    onClick={() => navigate(`/oeuvres/edit/${oeuvre.id}`)}
                                    disabled={oeuvre.is_public}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Supprimer">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(oeuvre.id)}
                                    disabled={oeuvre.is_public}
                                    color="error"
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
              )}

              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default OeuvresList;
