import React from 'react';
import { Grid, FormControl, InputLabel, Select, MenuItem, Box, Typography } from '@mui/material';

/**
 * Component for resource type and subtype selection
 */
const ResourceTypeSelector = ({
  formData,
  handleInputChange,
  resourceTypes,
  resourceSubTypes,
  loadingTypes,
  submitting,
  hideTypeSelection,
  lockTypeSelection,
  forcedType
}) => {
  if (hideTypeSelection && forcedType) {
    return (
      <Grid item xs={12}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle1">
            Type de ressource : <strong>{forcedType.typeName || 'Leçon'}</strong>
          </Typography>
          <Typography variant="subtitle1">
            Sous-type : <strong>{forcedType.subtypeName || 'Résumé de séquence'}</strong>
          </Typography>
        </Box>
      </Grid>
    );
  }

  if (hideTypeSelection) {
    return null;
  }

  return (
    <>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel id="type-label">Type</InputLabel>
          <Select
            labelId="type-label"
            name="resource_type_id"
            value={formData.resource_type_id || ''}
            onChange={handleInputChange}
            label="Type"
            disabled={lockTypeSelection || loadingTypes || resourceTypes.length === 0 || submitting}
          >
            {resourceTypes.map((type) => (
              <MenuItem key={type.id} value={String(type.id)}>
                {type.value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel id="subtype-label">Sous-type</InputLabel>
          <Select
            labelId="subtype-label"
            name="resource_sub_type_id"
            value={formData.resource_sub_type_id || ''}
            onChange={handleInputChange}
            label="Sous-type"
            disabled={formData.resource_type_id === '' || submitting}
          >
            {resourceSubTypes.map((subType) => (
              <MenuItem key={subType.id} value={String(subType.id)}>
                {subType.value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </>
  );
};

export default ResourceTypeSelector;