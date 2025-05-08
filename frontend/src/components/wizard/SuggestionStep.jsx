import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItemButton,
  Checkbox,
  ListItemText
} from '@mui/material';

const SuggestionStep = ({ 
  suggestions, 
  isLoadingSuggestions, 
  suggestionsError, 
  selectedSuggestionsIndices, 
  handleToggleSuggestion, 
  handleNextStep, 
  onClose 
}) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Étape 1: Suggestions d'exercices</Typography>
      {isLoadingSuggestions && <CircularProgress sx={{ display: 'block', margin: 'auto', my: 2 }} />}
      {suggestionsError && <Alert severity="error" sx={{ my: 2 }}>{suggestionsError}</Alert>}
      {!isLoadingSuggestions && !suggestionsError && suggestions.length === 0 && (
        <Typography sx={{ my: 2 }}>Aucune suggestion trouvée pour cette session.</Typography>
      )}
      {!isLoadingSuggestions && !suggestionsError && suggestions.length > 0 && (
        <List>
          {suggestions.map((suggestion, index) => (
            <ListItemButton 
              key={index} 
              onClick={() => handleToggleSuggestion(index)}
              sx={{ border: '1px solid #eee', mb: 1, borderRadius: '4px', bgcolor: selectedSuggestionsIndices[index] ? 'action.hover' : 'transparent' }}
            >
              <Checkbox checked={!!selectedSuggestionsIndices[index]} edge="start" disableRipple />
              <ListItemText 
                primary={`${suggestion.type_key} - ${suggestion.subtype_key}`}
                secondary={suggestion.justification}
              />
            </ListItemButton>
          ))}
        </List>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button onClick={onClose} sx={{ mr: 1 }}>Annuler</Button>
        <Button 
          variant="contained" 
          onClick={handleNextStep} 
          disabled={isLoadingSuggestions || suggestions.length === 0}
        >
          Générer Sélection
        </Button>
      </Box>
    </Box>
  );
};

SuggestionStep.propTypes = {
  suggestions: PropTypes.array.isRequired,
  isLoadingSuggestions: PropTypes.bool.isRequired,
  suggestionsError: PropTypes.string,
  selectedSuggestionsIndices: PropTypes.object.isRequired,
  handleToggleSuggestion: PropTypes.func.isRequired,
  handleNextStep: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default SuggestionStep;
