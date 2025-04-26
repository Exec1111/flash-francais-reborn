import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';

/**
 * ResourceEditorForm génère dynamiquement un formulaire
 * à partir d'un objet JSON initial, permettant à l'utilisateur
 * de modifier chaque propriété avant la fusion HTML.
 */
const ResourceEditorForm = ({ initialData, onSubmit, onCancel, onChange, hideButtons = false }) => {
  const [formData, setFormData] = useState(initialData);
  
  // Mise à jour du formData quand initialData change (navigation entre documents)
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleChange = (key) => (e) => {
    const newFormData = {
      ...formData,
      [key]: e.target.value,
    };
    setFormData(newFormData);
    
    // Notifier le parent des modifications en cours
    if (onChange) {
      onChange(newFormData);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Modifier les propriétés de la ressource
      </Typography>
      {Object.keys(formData).map((key) => (
        <TextField
          key={key}
          label={key}
          value={formData[key]}
          onChange={handleChange(key)}
          fullWidth
          multiline={typeof formData[key] === 'string' && formData[key].length > 100}
          sx={{ mb: 2 }}
        />
      ))}
      {!hideButtons && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} sx={{ mr: 1 }}>
            Annuler
          </Button>
          <Button variant="contained" onClick={() => onSubmit(formData)}>
            Valider
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ResourceEditorForm;
