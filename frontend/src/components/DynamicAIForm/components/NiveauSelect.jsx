import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';

/**
 * Composant spécifique pour le champ de sélection de niveau scolaire
 * Ce composant est utilisé directement pour contourner les problèmes de schéma
 */
const NiveauSelect = ({ 
  fieldName = 'niveau',
  label = 'Niveau',
  value = '',
  onChange,
  error,
  description = '',
  disabled = false,
  fullWidth = true,
  enumOptions = []
}) => {

  console.log(`[NiveauSelect] Rendu avec valeur actuelle: "${value}"`);

  const handleChange = (e) => {
    console.log(`[NiveauSelect] Nouvelle valeur sélectionnée: "${e.target.value}"`);
    onChange(e.target.value);
  };

  return (
    <FormControl 
      fullWidth={fullWidth} 
      error={!!error} 
      disabled={disabled}
      variant="outlined"
      margin="normal"
    >
      <InputLabel id={`${fieldName}-label`}>
        {label}
      </InputLabel>
      <Select
        labelId={`${fieldName}-label`}
        name={fieldName}
        value={value || ''}
        onChange={handleChange}
        label={label}
      >
        {/* Afficher les options si disponibles, sinon afficher un message d'erreur */}
        {enumOptions && enumOptions.length > 0 ? (
          enumOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled value="">
            Aucune option disponible
          </MenuItem>
        )}
      </Select>
      {(error || description) && (
        <FormHelperText>{error || description}</FormHelperText>
      )}
    </FormControl>
  );
};

export default NiveauSelect;
