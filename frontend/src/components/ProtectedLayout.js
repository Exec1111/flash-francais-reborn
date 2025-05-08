import React from 'react';
import { Box, Button, Typography, useTheme, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Retour au tableau de bord">
              <IconButton 
                color="primary"
                onClick={() => navigate('/dashboard')}
                aria-label="tableau de bord"
                sx={{ mr: 1 }}
              >
                <DashboardIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="h4" component="h1">
              Tableau de Bord
            </Typography>
          </Box>
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
