import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText
} from '@mui/material';

const SaveStep = ({
  isSavingResources,
  saveError,
  getResourcesReadyForSave,
  handlePrevStep,
  handleSaveResources,
  onClose
}) => {
  const readyResources = getResourcesReadyForSave();

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Résumé des Ressources Prêtes à Être Enregistrées
      </Typography>
      
      {isSavingResources && <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />}
      {saveError && <Alert severity="error" sx={{ my: 2 }}>{saveError}</Alert>}
      
      {!isSavingResources && !saveError && readyResources.length === 0 && (
        <Alert severity="warning" sx={{ my: 2 }}>
          Aucune ressource n'a été fusionnée avec succès pour l'enregistrement.
        </Alert>
      )}

      {!isSavingResources && (
        <List dense>
          {readyResources.map((item, index) => (
            <ListItem key={index} divider>
              <ListItemText 
                primary={item.suggestion.title || `Ressource ${index + 1}`}
                secondary={`Template: ${item.template_path || "Template automatique"}`}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={handlePrevStep} disabled={isSavingResources}>
          Précédent (Fusion HTML)
        </Button>
        <Box>
          <Button 
            variant="contained" 
            onClick={handleSaveResources} 
            disabled={isSavingResources || readyResources.length === 0}
            sx={{ mr: 1 }}
          >
            {isSavingResources ? <CircularProgress size={24} /> : "Enregistrer les Ressources"}
          </Button>
          <Button variant="outlined" onClick={onClose} disabled={isSavingResources}>
            Terminer
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

SaveStep.propTypes = {
  isSavingResources: PropTypes.bool.isRequired,
  saveError: PropTypes.string,
  getResourcesReadyForSave: PropTypes.func.isRequired,
  handlePrevStep: PropTypes.func.isRequired,
  handleSaveResources: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default SaveStep;
