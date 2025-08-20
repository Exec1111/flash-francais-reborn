import React from 'react';
import {
  Grid,
  Typography
} from '@mui/material';
import ChipArrayField from './ChipArrayField';

const TagsSection = ({ 
  formData, 
  onAddTag, 
  onRemoveTag 
}) => {
  return (
    <>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Tags et classification
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <ChipArrayField
          title="Tags"
          description="Étiquettes pour organiser et retrouver facilement cette œuvre"
          items={formData.tags}
          onAdd={onAddTag}
          onRemove={onRemoveTag}
          placeholder="Nouveau tag"
          buttonText="Ajouter tag"
        />
      </Grid>
    </>
  );
};

export default TagsSection;
