import React from 'react';
import {
  Grid,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch
} from '@mui/material';

const BasicInfoSection = ({ 
  formData, 
  onChange, 
  typesOeuvres = [] 
}) => {
  return (
    <>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Informations générales
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Titre de l'œuvre"
          value={formData.titre}
          onChange={(e) => onChange('titre', e.target.value)}
          required
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Nom de l'auteur"
          value={formData.auteur.nom}
          onChange={(e) => onChange('auteur.nom', e.target.value)}
          required
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Prénom de l'auteur"
          value={formData.auteur.prenom}
          onChange={(e) => onChange('auteur.prenom', e.target.value)}
          required
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Nationalité de l'auteur"
          value={formData.auteur.nationalite}
          onChange={(e) => onChange('auteur.nationalite', e.target.value)}
          required
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Type d'œuvre</InputLabel>
          <Select
            value={formData.type}
            onChange={(e) => onChange('type', e.target.value)}
            label="Type d'œuvre"
          >
            {typesOeuvres.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Genre littéraire"
          value={formData.genre}
          onChange={(e) => onChange('genre', e.target.value)}
          helperText="Ex: tragédie, comédie, épique, lyrique, fantastique, policier..."
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Mouvement littéraire"
          value={formData.mouvement_litteraire}
          onChange={(e) => onChange('mouvement_litteraire', e.target.value)}
          helperText="Ex: romantisme, réalisme, classicisme, surréalisme, nouveau roman..."
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Langue originale"
          value={formData.langue_originale}
          onChange={(e) => onChange('langue_originale', e.target.value)}
          helperText="Ex: français, anglais, espagnol, latin, grec ancien..."
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Année de publication"
          type="number"
          value={formData.date_publication}
          onChange={(e) => onChange('date_publication', parseInt(e.target.value) || '')}
          helperText="Année de première publication de l'œuvre"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.extrait}
              onChange={(e) => onChange('extrait', e.target.checked)}
            />
          }
          label="Il s'agit d'un extrait (cochez si vous ne saisissez qu'une partie de l'œuvre)"
        />
      </Grid>
    </>
  );
};

export default BasicInfoSection;
