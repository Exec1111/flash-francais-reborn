import React from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  IconButton,
  Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * Component for rendering QCM options with edit/delete functionality
 */
const SimpleOptionRenderer = ({
  option,
  optionIdx,
  parentPath = '',
  onOptionTextChange,
  onOptionIsCorrectChange,
  onRemoveOption
}) => {
  if (!option || typeof option !== 'object') {
    console.error("Option invalide:", option);
    return null;
  }

  return (
    <Box sx={{ ml: 2, mb: 1, p: 1, border: '1px solid #eee', borderRadius: 1 }} key={`option-${optionIdx}`}>
      <Grid container spacing={2}>
        <Grid item xs={8}>
          <TextField
            label="Texte de l'option"
            value={option.texte || option.text || ''}
            onChange={onOptionTextChange}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={3}>
          <FormControlLabel
            control={
              <Checkbox
                checked={!!option.isCorrect}
                onChange={onOptionIsCorrectChange}
              />
            }
            label="Correcte"
          />
        </Grid>
        <Grid item xs={1}>
          <IconButton
            size="small"
            color="error"
            onClick={onRemoveOption}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SimpleOptionRenderer;