import React from 'react';
import { Grid, Autocomplete, TextField } from '@mui/material';

/**
 * Component for oeuvres selection
 */
const ResourceOeuvresSelector = ({
  allOeuvres,
  selectedOeuvres,
  setSelectedOeuvres,
  submitting
}) => {
  return (
    <Grid item xs={12}>
      <Autocomplete
        multiple
        id="oeuvre-autocomplete"
        options={allOeuvres}
        getOptionLabel={(option) => option.titre || ''}
        value={selectedOeuvres}
        onChange={(_event, newValue) => setSelectedOeuvres(newValue)}
        filterSelectedOptions
        isOptionEqualToValue={(option, value) => option.id === value.id}
        disabled={submitting}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Œuvres"
            placeholder="Ajouter une œuvre"
            fullWidth
          />
        )}
      />
    </Grid>
  );
};

export default ResourceOeuvresSelector;