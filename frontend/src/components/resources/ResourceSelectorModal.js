import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  CircularProgress,
  TextField,
  Box,
  Typography
} from '@mui/material';
import resourceService from '../../services/resourceService';

const ResourceSelectorModal = ({ open, onClose, initialSelectedResources = [], onSave }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceSearchResults, setResourceSearchResults] = useState([]);
  const [selectedResources, setSelectedResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedResources(initialSelectedResources);
      fetchResources();
    }
    // eslint-disable-next-line
  }, [open]);

  const fetchResources = async () => {
    setLoading(true);
    setError('');
    try {
      const all = await resourceService.getAll();
      let filtered = Array.isArray(all) ? all : (all.items || []);
      if (searchTerm) {
        filtered = filtered.filter(r =>
          (r.title || r.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      setResourceSearchResults(filtered);
    } catch (err) {
      setError(err.detail || err.message || 'Erreur lors du chargement des ressources');
      setResourceSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (resource) => {
    if (selectedResources.some(r => r.id === resource.id)) {
      setSelectedResources(selectedResources.filter(r => r.id !== resource.id));
    } else {
      setSelectedResources([...selectedResources, resource]);
    }
  };

  const handleSaveChanges = () => {
    onSave(selectedResources);
    onClose();
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // Optionnel : lancer la recherche à chaque frappe
    // fetchResources();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Associer des ressources existantes</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Rechercher une ressource"
            value={searchTerm}
            onChange={handleSearch}
            fullWidth
            margin="dense"
            onKeyDown={e => {
              if (e.key === 'Enter') fetchResources();
            }}
          />
          <Button sx={{ mt: 1 }} onClick={fetchResources} variant="outlined" size="small">Rechercher</Button>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <List>
            {resourceSearchResults.map(resource => (
              <ListItem key={resource.id} button onClick={() => handleToggle(resource)}>
                <Checkbox
                  checked={selectedResources.some(r => r.id === resource.id)}
                  tabIndex={-1}
                  disableRipple
                />
                <ListItemText
                  primary={resource.title || resource.name || `Ressource ${resource.id}`}
                  secondary={resource.description}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Annuler</Button>
        <Button onClick={handleSaveChanges} variant="contained" color="primary">Valider</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResourceSelectorModal;
