import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SideTreeView, { drawerWidth } from './SideTreeView';
import { useAuth } from '../contexts/AuthContext';

const ProtectedLayout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  console.log('ProtectedLayout render:', {
    isAuthenticated,
    children: !!children,
  });

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <SideTreeView />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${drawerWidth}px)`,
          bgcolor: 'background.paper',
          minHeight: '100vh',
        }}
      >
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Tableau de Bord
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Se déconnecter
          </Button>
        </Box>
        {children}
      </Box>
    </Box>
  );
};

export default ProtectedLayout;
