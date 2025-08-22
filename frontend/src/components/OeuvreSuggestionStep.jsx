import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Alert, Card, CardContent, CardActions, Button } from '@mui/material';

const field = (obj, path, def = '') => {
  try {
    return path.split('.').reduce((a, k) => (a && a[k] !== undefined ? a[k] : undefined), obj) ?? def;
  } catch {
    return def;
  }
};

const OeuvreSuggestionStep = ({
  suggestions,
  isSuggesting,
  suggestionsError,
  selectedIndexes,
  onToggleSelect,
  onValidateSelection,
  onBack,
  onRetryAll,
}) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Suggestions d'œuvres (IA)</Typography>

      {isSuggesting && (
        <Alert severity="info" sx={{ mb: 2 }}>Génération des suggestions en cours…</Alert>
      )}

      {suggestionsError && (
        <Alert severity="error" sx={{ mb: 2 }}>{suggestionsError}</Alert>
      )}

      {!isSuggesting && !suggestionsError && suggestions.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Aucune suggestion disponible. Essayez d'ajouter des paramètres ou cliquez sur "Relancer".
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {suggestions.map((sugg, idx) => (
          <Card key={idx} variant="outlined" sx={{ width: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                {field(sugg, 'titre', '(Titre inconnu)')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Auteur: {field(sugg, 'auteur.prenom', field(sugg, 'auteur_prenom', ''))} {field(sugg, 'auteur.nom', field(sugg, 'auteur_nom', ''))}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Type: {field(sugg, 'type', field(sugg, 'type_prefere', '—'))}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Niveau: {field(sugg, 'niveau', field(sugg, 'niveau_cible', '—'))}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Format: {field(sugg, 'extrait', false) ? 'Extrait' : 'Œuvre complète'}
              </Typography>
              {(field(sugg, 'contenu.resume', '')).trim() && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Résumé: {field(sugg, 'contenu.resume')}
                </Typography>
              )}
              {(field(sugg, 'justification', '')).trim() && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Justification: {field(sugg, 'justification')}
                </Typography>
              )}
            </CardContent>
            <CardActions sx={{ justifyContent: 'space-between' }}>
              <Button size="small" variant="outlined" onClick={onBack}>Retour</Button>
              <Button
                size="small"
                variant={selectedIndexes?.includes(idx) ? 'outlined' : 'contained'}
                color={selectedIndexes?.includes(idx) ? 'secondary' : 'primary'}
                onClick={() => onToggleSelect(idx)}
              >
                {selectedIndexes?.includes(idx) ? 'Désélectionner' : 'Sélectionner'}
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
        <Button onClick={onBack}>Retour</Button>
        <Button variant="outlined" onClick={onRetryAll} disabled={isSuggesting}>Relancer</Button>
        <Button variant="contained" onClick={onValidateSelection} disabled={isSuggesting || (selectedIndexes?.length || 0) === 0}>
          Valider la sélection ({selectedIndexes?.length || 0})
        </Button>
      </Box>
    </Box>
  );
};

OeuvreSuggestionStep.propTypes = {
  suggestions: PropTypes.array.isRequired,
  isSuggesting: PropTypes.bool.isRequired,
  suggestionsError: PropTypes.string,
  selectedIndexes: PropTypes.array,
  onToggleSelect: PropTypes.func.isRequired,
  onValidateSelection: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onRetryAll: PropTypes.func.isRequired,
};

export default OeuvreSuggestionStep;
