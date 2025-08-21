import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Description as FileIcon,
  SmartToy as AiIcon
} from '@mui/icons-material';
import oeuvreService from '../../services/oeuvreService';
import ResourceSelectorModal from '../resources/ResourceSelectorModal';

const ResourceManagementModal = ({ 
  open, 
  onClose, 
  oeuvre,
  onResourcesUpdated 
}) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResourceSelector, setShowResourceSelector] = useState(false);

  const fetchOeuvreResources = useCallback(async () => {
    if (!oeuvre?.id) return null;
    
    setLoading(true);
    setError(null);
    try {
      // Récupérer l'œuvre avec ses relations
      const oeuvreWithResources = await oeuvreService.getOeuvre(oeuvre.id);
      setResources(oeuvreWithResources.resources || []);
      return oeuvreWithResources;
    } catch (err) {
      console.error('Erreur lors du chargement des ressources:', err);
      setError('Erreur lors du chargement des ressources');
      return null;
    } finally {
      setLoading(false);
    }
  }, [oeuvre?.id]);

  useEffect(() => {
    if (open && oeuvre) {
      fetchOeuvreResources();
    }
  }, [open, oeuvre, fetchOeuvreResources]);

  const handleAddResources = async (selectedResources) => {
    if (!oeuvre?.id || !selectedResources?.length) return;

    setLoading(true);
    try {
      // Ajouter chaque ressource à l'œuvre
      for (const resource of selectedResources) {
        await oeuvreService.addResourceToOeuvre(oeuvre.id, resource.id);
      }
      
      // Rafraîchir la liste
      const updatedOeuvre = await fetchOeuvreResources();
      
      // Notifier le parent
      if (onResourcesUpdated) {
        onResourcesUpdated(updatedOeuvre);
      }
    } catch (err) {
      console.error('Erreur lors de l\'ajout des ressources:', err);
      setError('Erreur lors de l\'ajout des ressources');
    } finally {
      setLoading(false);
      setShowResourceSelector(false);
    }
  };

  const handleRemoveResource = async (resourceId) => {
    if (!oeuvre?.id || !resourceId) return;

    setLoading(true);
    try {
      await oeuvreService.removeResourceFromOeuvre(oeuvre.id, resourceId);
      
      // Rafraîchir la liste
      const updatedOeuvre = await fetchOeuvreResources();
      
      // Notifier le parent
      if (onResourcesUpdated) {
        onResourcesUpdated(updatedOeuvre);
      }
    } catch (err) {
      console.error('Erreur lors de la suppression de la ressource:', err);
      setError('Erreur lors de la suppression de la ressource');
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (resource) => {
    return resource.source_type === 'ai' ? <AiIcon /> : <FileIcon />;
  };

  const getResourceTypeLabel = (resource) => {
    // Vous pouvez enrichir cela avec les types/sous-types réels
    return resource.type?.value || resource.source_type || 'Ressource';
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              Ressources liées à "{oeuvre?.titre}"
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={() => setShowResourceSelector(true)}
              disabled={loading}
            >
              Ajouter
            </Button>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {resources.length} ressource(s) associée(s)
              </Typography>

              {resources.length === 0 ? (
                <Box 
                  display="flex" 
                  flexDirection="column" 
                  alignItems="center" 
                  py={4}
                  sx={{ color: 'text.secondary' }}
                >
                  <FileIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body1">
                    Aucune ressource associée
                  </Typography>
                  <Typography variant="body2">
                    Cliquez sur "Ajouter" pour associer des ressources à cette œuvre
                  </Typography>
                </Box>
              ) : (
                <List>
                  {resources.map((resource, index) => (
                    <React.Fragment key={resource.id}>
                      <ListItem>
                        <Box sx={{ mr: 2 }}>
                          {getResourceIcon(resource)}
                        </Box>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle1">
                                {resource.title}
                              </Typography>
                              <Chip 
                                label={getResourceTypeLabel(resource)}
                                size="small"
                                variant="outlined"
                                color={resource.source_type === 'ai' ? 'secondary' : 'primary'}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {resource.description || 'Pas de description'}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveResource(resource.id)}
                            disabled={loading}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < resources.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de sélection des ressources */}
      <ResourceSelectorModal
        open={showResourceSelector}
        onClose={() => setShowResourceSelector(false)}
        onSave={handleAddResources}
        initialSelectedResources={resources}
        filterType={null}
      />
    </>
  );
};

export default ResourceManagementModal;
