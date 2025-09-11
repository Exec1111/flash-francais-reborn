import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import StorageUsagePanel from '../components/maintenance/StorageUsagePanel';

export default function SettingsStorage() {
  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5">Espace de stockage</Typography>
        <Typography variant="body2" color="text.secondary">
          Visualisez votre consommation, votre corbeille et videz-la si nécessaire.
        </Typography>
      </Box>
      <StorageUsagePanel />
    </Container>
  );
}
