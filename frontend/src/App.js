import React, { useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { 
  Box, 
  Button, 
  Typography, 
  AppBar as MuiAppBar, 
  Toolbar, 
  IconButton, 
  Fab,  
  Slide,
  Drawer,
  CssBaseline
} from '@mui/material'; 
import { 
  Menu as MenuIcon, 
  ChatBubbleOutline as ChatIcon, 
  KeyboardArrowUp as ArrowUpIcon, 
  KeyboardArrowDown as ArrowDownIcon 
} from '@mui/icons-material'; 
import { useTheme } from '@mui/material/styles'; 
import SideTreeView, { drawerWidth } from './components/SideTreeView';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login'; 
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/Dashboard';
import ResourceList from './components/resources/ResourceList';
import Contact from './pages/Contact';
import { useAuth } from './contexts/AuthContext';
import NewResource from './pages/resources/NewResource';
import ResourceEdit from './pages/resources/ResourceEdit';
import ResourceView from './pages/ResourceView'; // <-- CORRIGÉ: Chemin d'import
import Chatbox from './components/Chatbox/Chatbox'; 

// --- Composant de Layout Protégé ---
function ProtectedLayout() {
  const { user } = useAuth();
  // État pour la barre latérale principale (TreeView)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  // État pour la chatbox latérale
  const [isChatboxOpen, setIsChatboxOpen] = useState(false); 
  const theme = useTheme(); 

  // Handlers pour la barre latérale principale
  const handleSidebarOpen = () => {
    setIsSidebarOpen(true);
  };
  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  // Handlers pour la chatbox
  const handleToggleChatbox = () => {
    setIsChatboxOpen(!isChatboxOpen);
  };
  const handleCloseChatbox = () => {
    setIsChatboxOpen(false);
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Largeur du drawer (assurez-vous que cette variable est définie ou importée si elle vient d'ailleurs)
  const drawerWidth = 240; // Valeur typique, ajustez si nécessaire

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline /> 
      {/* AppBar fixe en haut */}
      <MuiAppBar 
        position="fixed" 
        open={isSidebarOpen}
        sx={{
          minHeight: '40px', // Réduite de 64px à 40px
          padding: '0 8px', // Réduit le padding
        }}
      >
        <Toolbar disableGutters sx={{ minHeight: '40px' }}>
          {/* Bouton pour ouvrir la sidebar (hamburger) */}
          <IconButton
            size="small" // Réduit la taille du bouton
            color="inherit"
            aria-label="open drawer"
            onClick={handleSidebarOpen}
            edge="start"
            sx={{ mr: 1, ...(isSidebarOpen && { display: 'none' }) }}
          >
            <MenuIcon sx={{ fontSize: '20px' }} /> {/* Réduit la taille de l'icône */}
          </IconButton>
          {/* Titre "Flash Francais" supprimé */}
          {/* 
          <Typography variant="h6" noWrap component="div">
            Flash Francais 
          </Typography>
          */}
          {/* Reste de la Toolbar (peut être vide) */}
        </Toolbar>
      </MuiAppBar>

      {/* Barre latérale principale (TreeView) */}
      {/* Passer les props pour contrôler l'ouverture/fermeture */}
      <SideTreeView 
        open={isSidebarOpen} 
        handleDrawerOpen={handleSidebarOpen} 
        handleDrawerClose={handleSidebarClose} 
      />
      {/* Contenu principal */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          display: 'flex', 
          flexDirection: 'column',
          // Marge supérieure réduite pour correspondre à la nouvelle hauteur de l'AppBar
          marginTop: '40px', 
          // Logique pour décaler le contenu quand la sidebar est ouverte
          transition: theme.transitions.create('margin', { 
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: `-${drawerWidth}px`, 
          ...(isSidebarOpen && { 
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            }),
            marginLeft: 0, 
          }),
        }}
      >
        {/* <Toolbar /> NO LONGER NEEDED HERE - AppBar provides the space */}
        <Outlet /> 
      </Box>

      {/* Chatbox Section */}
      {/* FAB to toggle Chatbox - Positionné en bas à droite */}
      <Fab 
        color="primary" 
        aria-label="toggle chatbox" 
        onClick={handleToggleChatbox}
        sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: (theme) => theme.zIndex.drawer + 2 }} 
      >
        <ChatIcon />
      </Fab>

      {/* Sliding Chatbox Container - Modifié pour être à droite */}
      <Drawer
        anchor="right" 
        open={isChatboxOpen}
        onClose={handleCloseChatbox} 
        PaperProps={{ sx: { width: '400px', height: '100vh', boxShadow: 3, zIndex: (theme) => theme.zIndex.drawer + 1 } }} 
      >
        {/* Le contenu du Drawer (la Chatbox) */}
        <Chatbox onClose={handleCloseChatbox} /> 
      </Drawer>

    </Box>
  );
}
// ---------------------------------

// --- Composant de Route Protégée ---
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) { 
    return <Navigate to="/login" replace />;
  }
  return children;
}
// ---------------------------------

function App() {
  const { isAuthenticated } = useAuth();
  console.log('App: État d\'authentification:', isAuthenticated);

  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Routes protégées */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
      </Route>

      <Route
        path="/resources"
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ResourceList session={useAuth()} />} />
        <Route path="new" element={<NewResource />} />
        <Route path="edit/:id" element={<ResourceEdit />} />
        <Route path="view/:id" element={<ResourceView />} /> {/* <-- Nouvelle route */}
      </Route>

      {/* Redirection par défaut */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}

export default App;
