import React from 'react';
import {
  Grid,
  TextField,
  Typography
} from '@mui/material';
import ChipArrayField from './ChipArrayField';

const ContentSection = ({ 
  formData, 
  onChange, 
  onAddTheme, 
  onRemoveTheme, 
  onAddMotsCles, 
  onRemoveMotsCles 
}) => {
  return (
    <>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Contenu de l'œuvre
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Résumé"
          value={formData.resume}
          onChange={(e) => onChange('resume', e.target.value)}
          helperText="Résumé de l'intrigue ou du contenu principal de l'œuvre"
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Contexte historique"
          value={formData.contexte_historique}
          onChange={(e) => onChange('contexte_historique', e.target.value)}
          helperText="Contexte historique, social et culturel de l'époque"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <ChipArrayField
          title="Thèmes principaux"
          description="Les grands thèmes abordés dans l'œuvre"
          items={formData.themes}
          onAdd={onAddTheme}
          onRemove={onRemoveTheme}
          placeholder="Nouveau thème"
          buttonText="Ajouter thème"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <ChipArrayField
          title="Mots-clés"
          description="Mots-clés pour faciliter la recherche"
          items={formData.mots_cles}
          onAdd={onAddMotsCles}
          onRemove={onRemoveMotsCles}
          placeholder="Nouveau mot-clé"
          buttonText="Ajouter mot-clé"
        />
      </Grid>
    </>
  );
};

export default ContentSection;
