import React from 'react';
import { Chip, Box, Typography } from '@mui/material';

const StudyObjectChips = ({ studyObjects, onClick }) => {
  if (!studyObjects || studyObjects.length === 0) {
    return <Typography variant="body2" color="text.secondary">Aucun objet d'étude associé.</Typography>;
  }
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {studyObjects.map(obj => (
        <Chip
          key={obj.id}
          label={obj.title}
          onClick={onClick ? () => onClick(obj) : undefined}
          sx={{ cursor: onClick ? 'pointer' : 'default' }}
        />
      ))}
    </Box>
  );
};

export default StudyObjectChips;
