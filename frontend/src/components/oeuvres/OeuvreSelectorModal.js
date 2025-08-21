import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Typography,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import oeuvreService from '../../services/oeuvreService';

const OeuvreSelectorModal = ({ 
  open, 
  onClose, 
  onSelect, 
  selectedOeuvres = [],
  multiSelect = true,
  title = "Sélectionner des œuvres"
}) => {
  const [oeuvres, setOeuvres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 20,
    total: 0
  });
  const [availableTypes, setAvailableTypes] = useState([]);
  const [availableGenres, setAvailableGenres] = useState([]);

  const fetchOeuvres = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        skip: pagination.page * pagination.limit,
        limit: pagination.limit,
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      if (typeFilter) {
        params.type = typeFilter;
      }
      if (genreFilter) {
        params.genre = genreFilter;
      }
      
      const response = await oeuvreService.getOeuvres(params);
      setOeuvres(response.items || []);
      setPagination(prev => ({ ...prev, total: response.total || 0 }));
    } catch (error) {
      console.error('Erreur lors du chargement des œuvres:', error);
      setError('Erreur lors du chargement des œuvres');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, typeFilter, genreFilter]);

  useEffect(() => {
    if (open) {
      setSelectedIds(selectedOeuvres.map(o => o.id) || []);
      fetchOeuvres();
      fetchFilters();
    }
  }, [open, selectedOeuvres, fetchOeuvres]);

  const fetchFilters = async () => {
    try {
      // Ces endpoints pourraient être ajoutés au service si nécessaire
      // Pour l'instant, on extrait les types/genres des œuvres chargées
      const response = await oeuvreService.getOeuvres({ limit: 1000 });
      const allOeuvres = response.items || [];
      
      const types = [...new Set(allOeuvres.map(o => o.type).filter(Boolean))];
      const genres = [...new Set(allOeuvres.map(o => o.genre).filter(Boolean))];
      
      setAvailableTypes(types);
      setAvailableGenres(genres);
    } catch (err) {
      console.error('Erreur lors du chargement des filtres:', err);
    }
  };

  const handleToggleSelection = (oeuvreId) => {
    if (multiSelect) {
      setSelectedIds(prev => 
        prev.includes(oeuvreId)
          ? prev.filter(id => id !== oeuvreId)
          : [...prev, oeuvreId]
      );
    } else {
      setSelectedIds([oeuvreId]);
    }
  };

  const handleConfirm = () => {
    const selectedOeuvres = oeuvres.filter(oeuvre => selectedIds.includes(oeuvre.id));
    onSelect(multiSelect ? selectedOeuvres : selectedOeuvres[0]);
    onClose();
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const handleTypeFilterChange = (event) => {
    setTypeFilter(event.target.value);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const handleGenreFilterChange = (event) => {
    setGenreFilter(event.target.value);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const getOeuvreSecondaryText = (oeuvre) => {
    const parts = [];
    if (oeuvre.type) parts.push(oeuvre.type);
    if (oeuvre.genre) parts.push(oeuvre.genre);
    if (oeuvre.date_publication) parts.push(oeuvre.date_publication.toString());
    return parts.join(' • ');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {/* Filtres de recherche */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Rechercher"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Titre, auteur..."
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              onChange={handleTypeFilterChange}
              label="Type"
            >
              <MenuItem value="">Tous</MenuItem>
              {availableTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Genre</InputLabel>
            <Select
              value={genreFilter}
              onChange={handleGenreFilterChange}
              label="Genre"
            >
              <MenuItem value="">Tous</MenuItem>
              {availableGenres.map(genre => (
                <MenuItem key={genre} value={genre}>{genre}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Résultats */}
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {pagination.total} œuvre(s) trouvée(s)
              {selectedIds.length > 0 && ` • ${selectedIds.length} sélectionnée(s)`}
            </Typography>
            
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {oeuvres.map((oeuvre) => (
                <ListItem
                  key={oeuvre.id}
                  button
                  onClick={() => handleToggleSelection(oeuvre.id)}
                  selected={selectedIds.includes(oeuvre.id)}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {oeuvre.titre}
                        </Typography>
                        {oeuvre.extrait && (
                          <Chip 
                            label="Extrait" 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                          />
                        )}
                        {oeuvre.is_public && (
                          <Chip 
                            label="Public" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {oeuvre.auteur_complet}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getOeuvreSecondaryText(oeuvre)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Checkbox
                      edge="end"
                      checked={selectedIds.includes(oeuvre.id)}
                      onChange={() => handleToggleSelection(oeuvre.id)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            {oeuvres.length === 0 && !loading && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                align="center" 
                sx={{ py: 4 }}
              >
                Aucune œuvre trouvée
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Annuler
        </Button>
        <Button 
          onClick={handleConfirm}
          variant="contained"
          disabled={selectedIds.length === 0}
        >
          Confirmer ({selectedIds.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OeuvreSelectorModal;
