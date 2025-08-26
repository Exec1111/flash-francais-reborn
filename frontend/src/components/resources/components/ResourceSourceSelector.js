import React from 'react';
import { Grid, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';

/**
 * Component for resource source selection (AI, File, URL)
 */
const ResourceSourceSelector = ({
  sourceType,
  handleSourceTypeChange,
  submitting,
  disableSourceSelection
}) => {
  if (disableSourceSelection) {
    return null;
  }

  return (
    <Grid item xs={12}>
      <FormControl component="fieldset" disabled={submitting}>
        <FormLabel component="legend">Source de la ressource</FormLabel>
        <RadioGroup
          row
          aria-label="source-type"
          name="source_type"
          value={sourceType}
          onChange={handleSourceTypeChange}
        >
          <FormControlLabel value="ai" control={<Radio />} label="Générée par IA" />
          <FormControlLabel value="file" control={<Radio />} label="Fichier" />
          <FormControlLabel value="url" control={<Radio />} label="URL externe" />
        </RadioGroup>
      </FormControl>
    </Grid>
  );
};

export default ResourceSourceSelector;