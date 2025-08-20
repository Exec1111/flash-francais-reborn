import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip
} from '@mui/material';

const ChipArrayField = ({ 
  title, 
  description, 
  items = [], 
  onAdd, 
  onRemove, 
  placeholder = "Nouveau élément",
  buttonText = "Ajouter"
}) => {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {description}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        {items.map((item, index) => (
          <Chip
            key={index}
            label={item}
            onDelete={() => onRemove(index)}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          label={placeholder}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button
          variant="outlined"
          onClick={handleAdd}
        >
          {buttonText}
        </Button>
      </Box>
    </Box>
  );
};

export default ChipArrayField;
