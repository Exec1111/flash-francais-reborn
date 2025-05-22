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
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

const GenerationStep = ({ 
  generationStatus, 
  isGenerating, 
  allGenerationsDone, 
  handlePrevStep, 
  handleNextStep,
  formatErrorMessage 
}) => {
  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Génération des exercices</Typography>
      {isGenerating && generationStatus.some(s => s.status === 'loading') && 
        <CircularProgress sx={{ display: 'block', margin: 'auto', my: 2 }} />
      }
      
      <List>
        {generationStatus.map((item, index) => (
          <ListItem key={index} sx={{ border: '1px solid #eee', mb: 1, borderRadius: '4px' }}>
            <ListItemIcon>
              {item.status === 'pending' && <HourglassEmptyIcon color="disabled" />}
              {item.status === 'loading' && <CircularProgress size={24} />}
              {item.status === 'success' && <CheckCircleIcon color="success" />}
              {item.status === 'error' && <ErrorIcon color="error" />}
            </ListItemIcon>
            <ListItemText 
              primary={
                <>
                  <Chip 
                    label={item.suggestion?.type_key || 'Type inconnu'} 
                    color="primary" 
                    size="small" 
                    variant="outlined" 
                    sx={{ mr: 1 }}
                  />
                  <Chip 
                    label={item.suggestion?.subtype_key || 'Sous-type inconnu'} 
                    color="secondary" 
                    size="small" 
                    variant="outlined" 
                  />
                </>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  {item.status === 'error' ? 
                    (typeof item.error === 'string' ? item.error : formatErrorMessage(item.error, "Erreur de génération")) : 
                    (item.status === 'success' ? 
                      'Généré avec succès' : 
                      item.status === 'loading' ? 'Génération en cours...' : 'En attente...')}
                  {item.suggestion?.parameters && item.suggestion.parameters.length > 0 && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                      {item.suggestion.parameters
                        .filter(p => p.name === 'theme' || p.name === 'instructions_personnalisees')
                        .map(p => p.value)
                        .filter(Boolean)
                        .join(' - ')}
                    </Typography>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={handlePrevStep} disabled={isGenerating}>
          Précédent
        </Button>
        <Button 
          variant="contained" 
          onClick={handleNextStep} 
          disabled={isGenerating || !allGenerationsDone}
        >
          Suivant (Édition)
        </Button>
      </Box>
    </Box>
  );
};

GenerationStep.propTypes = {
  generationStatus: PropTypes.array.isRequired,
  isGenerating: PropTypes.bool.isRequired,
  allGenerationsDone: PropTypes.bool.isRequired,
  handlePrevStep: PropTypes.func.isRequired,
  handleNextStep: PropTypes.func.isRequired,
  formatErrorMessage: PropTypes.func.isRequired
};

export default GenerationStep;
