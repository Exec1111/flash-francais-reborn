import React from 'react';
import {
  Grid,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

const PedagogySection = ({ 
  formData, 
  onChange, 
  niveauxScolaires = [] 
}) => {
  return (
    <>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Informations pédagogiques
        </Typography>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Niveau scolaire recommandé</InputLabel>
          <Select
            value={formData.niveau_scolaire}
            onChange={(e) => onChange('niveau_scolaire', e.target.value)}
            label="Niveau scolaire recommandé"
          >
            {niveauxScolaires.map((niveau) => (
              <MenuItem key={niveau} value={niveau}>
                {niveau}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Difficulté de lecture"
          value={formData.difficulte_lecture}
          onChange={(e) => onChange('difficulte_lecture', e.target.value)}
          helperText="Ex: facile, moyen, difficile"
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Intérêt pédagogique"
          value={formData.interet_pedagogique}
          onChange={(e) => onChange('interet_pedagogique', e.target.value)}
          helperText="Pourquoi cette œuvre est-elle intéressante à étudier ?"
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Pistes d'exploitation pédagogique"
          value={formData.pistes_pedagogiques}
          onChange={(e) => onChange('pistes_pedagogiques', e.target.value)}
          helperText="Suggestions d'activités et d'analyses possibles"
        />
      </Grid>
    </>
  );
};

export default PedagogySection;
