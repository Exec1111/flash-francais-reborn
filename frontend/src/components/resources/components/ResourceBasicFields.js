import React from 'react';
import { Grid, TextField } from '@mui/material';

/**
 * Component for basic resource form fields (title, description)
 */
const ResourceBasicFields = ({
  formData,
  handleInputChange,
  submitting
}) => {
  return (
    <Grid item xs={12}>
      <TextField
        fullWidth
        label="Titre"
        name="title"
        value={formData.title}
        onChange={handleInputChange}
        required
        disabled={submitting}
      />
    </Grid>
  );
};

export default ResourceBasicFields;