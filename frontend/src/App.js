import React, { useState, useEffect, useCallback } from 'react';
import { 
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { 
  Box, 
  CssBaseline, 
  AppBar as MuiAppBar, 
  Toolbar, 
  IconButton, 
  Drawer, 
  Fab,
} from '@mui/material'; 
import { 
  Menu as MenuIcon, 
  ChatBubbleOutline as ChatIcon, 
} from '@mui/icons-material'; 
import { useTheme } from '@mui/material/styles'; 
import SideTreeView, { drawerWidth } from './components/SideTreeView';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login'; 
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/Dashboard';
import ResourceList from './components/resources/ResourceList';
import NewResource from './pages/resources/NewResource';
import ResourceEdit from './pages/resources/ResourceEdit';
import ResourceView from './pages/ResourceView'; 
import { useAuth } from './contexts/AuthContext'; // Réimporter le hook useAuth
import Chatbox from './components/Chatbox/Chatbox'; 
import ProgressionBuilder from './pages/ProgressionBuilder'; 
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import api from './services/api'; 
import TreeDataContext from './contexts/TreeDataContext'; // Réimporter le contexte

// --- Composant de Layout Protégé ---
function ProtectedLayout() {
  const { user, token } = useAuth(); // Ajouter token ici si nécessaire pour le fetch initial
  // État pour la barre latérale principale (TreeView)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  // État pour la chatbox latérale
  const [isChatboxOpen, setIsChatboxOpen] = useState(false); 
  const theme = useTheme(); 
 
  // État pour les données du TreeView (déplacé depuis SideTreeView)
  const [treeData, setTreeData] = useState({ id: 'root', name: 'Progressions', type: 'root', children: [] }); 
  const [isTreeLoading, setIsTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState(null);

  // Handlers pour la barre latérale principale
  const handleSidebarOpen = () => {
    setIsSidebarOpen(true);
  };
  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  // Fonction pour charger/rafraîchir les données du TreeView (déplacée et adaptée depuis SideTreeView)
  const refreshTreeData = useCallback(async () => {
    console.log("ProtectedLayout: Refreshing tree data...");
    setIsTreeLoading(true);
    setTreeError(null);
    try {
      if (!token) {
        // Gérer le cas où le token n'est pas encore prêt (peut arriver au chargement initial)
        console.warn("RefreshTreeData: Token not available yet.");
        // Optionnel: attendre un peu ou ne rien faire
        return; 
      }
      // Utiliser l'instance api pour faire l'appel (le token est injecté par l'intercepteur)
      const response = await api.get('/progressions'); 
      const progressions = response.data;

      console.log("ProtectedLayout: Progressions data fetched:", progressions);

      // Adapter les données reçues au format attendu par SideTreeView
      // TODO: Il faudra enrichir ce format pour inclure objectifs, séquences, etc.
      const formattedProgressions = progressions.map(prog => ({
        id: prog.id,
        name: prog.title, 
        type: 'progression', 
        description: prog.description,
        // La logique d'expansion dynamique reste dans SideTreeView pour l'instant
        children: [{ id: `loading-${prog.id}`, name: 'Chargement...', type: 'loading' }]
      }));

      setTreeData(prevData => ({ ...prevData, children: formattedProgressions }));
    } catch (e) {
      console.error("Erreur lors du chargement des progressions:", e);
      setTreeError(e.message || 'Erreur lors du chargement des données de l\'arbre.');
      setTreeData(prevData => ({ ...prevData, children: [] })); // Vider en cas d'erreur
    } finally {
      setIsTreeLoading(false);
    }
  }, [token]); // Dépend du token pour s'assurer qu'il est disponible

  // Chargement initial des données au montage de ProtectedLayout
  useEffect(() => {
    if (user && token) { // S'assurer que l'utilisateur est connecté et que le token est prêt
      refreshTreeData();
    }
  }, [user, token, refreshTreeData]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handlers pour la chatbox (simplifiés)
  const handleToggleChatbox = () => setIsChatboxOpen(!isChatboxOpen);
  const handleCloseChatbox = () => setIsChatboxOpen(false);

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
        </Toolbar>
      </MuiAppBar>

      {/* Remettre le Provider ici */}
      <TreeDataContext.Provider value={{ treeData, isTreeLoading, treeError, refreshTreeData }}>
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
            marginTop: '40px', 
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
          <Outlet /> 
        </Box>

        {/* Chatbox Section */}
        {/* FAB to toggle Chatbox */}
        <Fab 
          color="secondary" 
          aria-label="chat" 
          onClick={handleToggleChatbox}
          sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: (theme) => theme.zIndex.drawer + 2 }} 
        >
          <ChatIcon />
        </Fab>

        {/* Sliding Chatbox Container */}
        <Drawer
          anchor="right" 
          open={isChatboxOpen}
          onClose={handleCloseChatbox} 
          PaperProps={{ sx: { width: '400px', height: '100vh', boxShadow: 3, zIndex: (theme) => theme.zIndex.drawer + 1 } }} 
        >
          <Chatbox onClose={handleCloseChatbox} /> 
        </Drawer>
      </TreeDataContext.Provider>
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
    <ThemeProvider theme={theme}>
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
        <Route path="dashboard" element={<Dashboard />} />
        {/* <Route path="profile" element={<Profile />} /> */}
        {/* <Route path="settings" element={<Settings />} /> */}
        {/* Route pour le constructeur de progression */}
        <Route path="progressions/new" element={<ProgressionBuilder />} />
        <Route path="progressions/edit/:progressionId" element={<ProgressionBuilder />} />
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
        <Route path="view/:id" element={<ResourceView />} /> 
      </Route>

      <Route
        path="/progressions"
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="new" element={<ProgressionBuilder />} />
        <Route path="edit/:id" element={<ProgressionBuilder />} />
      </Route>

      {/* Redirection par défaut */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
    </Routes>
    </ThemeProvider>
  );
}

export default App;

/* Importer les pages quand elles seront créées
import Profile from './pages/Profile'; 
import Settings from './pages/Settings'; 
*/
