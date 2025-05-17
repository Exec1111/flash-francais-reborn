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
  Typography,
  Pagination
} from '@mui/material';
import resourceService from '../../services/resourceService';

const ResourceSelectorModal = ({ open, onClose, initialSelectedResources = [], onSave }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceSearchResults, setResourceSearchResults] = useState([]);
  const [selectedResources, setSelectedResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (open) {
      setSelectedResources(initialSelectedResources);
      setCurrentPage(1); 
      fetchResources(1, searchTerm); 
    }
    // eslint-disable-next-line
  }, [open, initialSelectedResources]); 

  const fetchResources = async (page, currentSearchTerm) => {
    setLoading(true);
    setError('');
    try {
      const skip = (page - 1) * itemsPerPage;
      const params = {
        skip,
        limit: itemsPerPage,
        search: currentSearchTerm || null, 
        typeId: null, 
        subTypeId: null 
      };
      const response = await resourceService.getAll(params);
      
      setResourceSearchResults(response.items || []);
      setTotalPages(Math.ceil(response.total / itemsPerPage) || 0);

    } catch (err) {
      setError(err.detail || err.message || 'Erreur lors du chargement des ressources');
      setResourceSearchResults([]);
      setTotalPages(0);
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
  };

  const triggerSearch = () => {
    setCurrentPage(1); 
    fetchResources(1, searchTerm);
  };

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    fetchResources(value, searchTerm);
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
              if (e.key === 'Enter') triggerSearch(); 
            }}
          />
          <Button sx={{ mt: 1 }} onClick={triggerSearch} variant="outlined" size="small">Rechercher</Button> 
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
        {totalPages > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
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
