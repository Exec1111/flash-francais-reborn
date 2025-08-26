import React from 'react';
import { Grid, Autocomplete, TextField } from '@mui/material';

/**
 * Component for study objects selection
 */
const ResourceStudyObjectsSelector = ({
  allStudyObjects,
  selectedStudyObjects,
  setSelectedStudyObjects,
  submitting,
  hideStudyObjectSelection
}) => {
  if (hideStudyObjectSelection) {
    return null;
  }

  return (
    <Grid item xs={12}>
      <Autocomplete
        multiple
        id="study-object-autocomplete"
        options={allStudyObjects}
        getOptionLabel={(option) => option.title || ''}
        value={selectedStudyObjects}
        onChange={(_event, newValue) => setSelectedStudyObjects(newValue)}
        filterSelectedOptions
        isOptionEqualToValue={(option, value) => option.id === value.id}
        disabled={submitting}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Objets d'étude"
            placeholder="Ajouter un objet d'étude"
            fullWidth
          />
        )}
      />
    </Grid>
  );
};

export default ResourceStudyObjectsSelector;