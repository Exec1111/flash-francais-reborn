import React, { useState, useEffect, useCallback } from 'react';
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
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'; 
import { useTheme } from '@mui/material/styles'; 
import SideNav, { drawerWidth } from './components/SideNav';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login'; 
import AdminLLMLogs from './pages/AdminLLMLogs';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/Dashboard';
import ResourceList from './components/resources/ResourceList';
import NewResource from './pages/resources/NewResource';
import ResourceEdit from './pages/resources/ResourceEdit';
import ResourceView from './pages/ResourceView';
import ObjectiveList from './pages/objectives/ObjectiveList';
import LayoutContext from './contexts/LayoutContext';
import NewObjective from './pages/objectives/NewObjective';
import ObjectiveEdit from './pages/objectives/ObjectiveEdit';
import ObjectiveDetailPage from './pages/objectives/ObjectiveDetailPage';
import SequenceDetailPage from './pages/sequences/SequenceDetailPage';
import ManageSequenceObjectivesPage from './pages/sequences/ManageSequenceObjectivesPage';
import NewSequence from './pages/sequences/NewSequence';
import SequenceEdit from './pages/sequences/SequenceEdit'; 
// Le composant ProposeSeances a été temporairement retiré pour résoudre un problème d'importation
import ProposeSeances from './pages/sequences/ProposeSeances'; // Réactivé et déplacé
import SequenceSummaryResourcePage from './pages/sequences/SequenceSummaryResourcePage';
import SessionFicheBuilderPage from './pages/sessions/SessionFicheBuilderPage';
import NewSession from './pages/sessions/NewSession';
import SessionEdit from './pages/sessions/SessionEdit';
import SessionDetailPage from './pages/sessions/SessionDetailPage';
import SessionSummaryResourcePage from './pages/sessions/SessionSummaryResourcePage';
import { useAuth } from './contexts/AuthContext'; // Réimporter le hook useAuth
import Chatbox from './components/Chatbox/Chatbox'; 
import ProgressionBuilder from './pages/progressions/ProgressionBuilder'; 
import ProgressionDetailPage from './pages/progressions/ProgressionDetailPage'; // Importer la nouvelle page
import ProgressionEditPage from './pages/progressions/ProgressionEditPage';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import api from './services/api'; 
import TreeDataContext from './contexts/TreeDataContext'; // Réimporter le contexte
import StudyObjectList from './pages/studyObjects/StudyObjectList';
import NewStudyObject from './pages/studyObjects/NewStudyObject';
import EditStudyObject from './pages/studyObjects/EditStudyObject';
import StudyObjectDetail from './pages/studyObjects/StudyObjectDetail';
import ProposeWorks from './pages/studyObjects/ProposeWorks';
import OeuvresList from './pages/oeuvres/OeuvresList';
import NewOeuvre from './pages/oeuvres/NewOeuvre';
import EditOeuvre from './pages/oeuvres/EditOeuvre';
import OeuvreDetail from './pages/oeuvres/OeuvreDetail';
import OeuvreWizard from './components/OeuvreWizard';

// --- Composant de Layout Protégé ---
function ProtectedLayout() {
  const { user, token, logout } = useAuth(); // Ajouter token ici si nécessaire pour le fetch initial
  const navigate = useNavigate(); // Hook de navigation React Router
  const location = useLocation(); // Hook de localisation React Router
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
      
      // Utiliser l'instance api pour faire l'appel (le token est injecté par l'intercepteur)
      const response = await api.get('/progressions/'); 
      const progressions = response.data;

      console.log("ProtectedLayout: Progressions data fetched:", progressions);

      // Adapter les données reçues au format attendu par SideTreeView
      // TODO: Il faudra enrichir ce format pour inclure objectifs, séquences, etc.
      const formattedProgressions = progressions.map(prog => ({
        id: prog.id,
        name: prog.title, 
        type: 'progression', 
        description: prog.description,
        order: prog.order, // <-- Ajout du champ order pour le tri !
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
  }, []);

  // Chargement initial des données au montage de ProtectedLayout
  useEffect(() => {
    if (user && token) { // S'assurer que l'utilisateur est connecté et que le token est prêt
      refreshTreeData();
    }
  }, [user, token, refreshTreeData]);

  console.log('USER:', user);
  // Ne pas rediriger ici pour éviter un retour au login pendant la restauration de session

  // Handlers pour la chatbox (simplifiés)
  const handleToggleChatbox = () => setIsChatboxOpen(!isChatboxOpen);
  const handleCloseChatbox = () => setIsChatboxOpen(false);

  // Valeurs du contexte layout
  const layoutContextValue = {
    isSidebarOpen,
    handleSidebarOpen,
    handleSidebarClose,
    isChatboxOpen,
    handleToggleChatbox,
    handleCloseChatbox
  };

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
        <Toolbar disableGutters sx={{ minHeight: '40px', display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
          </Box>
          
          {/* Groupe de boutons alignés à droite */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Bouton pour revenir au tableau de bord */}
            <IconButton
              size="small"
              color="inherit"
              aria-label="tableau de bord"
              onClick={() => navigate('/dashboard')}
              sx={{ mr: 1 }}
            >
              <DashboardIcon sx={{ fontSize: '20px' }} />
            </IconButton>
            {/* Bouton de déconnexion */}
            <IconButton
              size="small"
              color="inherit"
              aria-label="se déconnecter"
              onClick={() => { logout(); navigate('/login'); }}
              sx={{ mr: 1 }}
            >
              <LogoutIcon sx={{ fontSize: '20px' }} />
            </IconButton>
            
            {/* Bouton logs LLM visible uniquement pour ADMIN */}
            {user && user.role && user.role.toLowerCase() === 'admin' && (
              <IconButton
                size="small"
                color="inherit"
                aria-label="logs LLM"
                onClick={() => navigate('/dashboard/admin/llm-logs')}
                sx={{ mr: 1 }}
              >
                <span role="img" aria-label="llm-logs" style={{fontSize:'18px'}}>🤖</span>
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </MuiAppBar>

      {/* Remettre le Provider ici */}
      <LayoutContext.Provider value={layoutContextValue}>
        <TreeDataContext.Provider value={{ treeData, isTreeLoading, treeError, refreshTreeData }}>
        <SideNav
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
      </LayoutContext.Provider>
    </Box>
  );
}
// ---------------------------------

// --- Composant de Route Protégée ---
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) { 
    return <Navigate to="/login" state={{ from: location }} replace />;
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
        {/* Route protégée pour les logs LLM admin */}
        <Route path="admin/llm-logs" element={<AdminLLMLogs />} />
        {/* <Route path="profile" element={<Profile />} /> */}
        {/* <Route path="settings" element={<Settings />} /> */}
        {/* Route pour le constructeur de progression */}
        <Route path="progressions/new" element={<ProgressionBuilder />} />
        <Route path="progressions/:id" element={<ProgressionDetailPage />} /> {/* Nouvelle route de consultation */}
        <Route path="progressions/edit/:id" element={<ProgressionEditPage />} />
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
        <Route path=":id" element={<ProgressionDetailPage />} /> {/* Nouvelle route de consultation */}
        <Route path="edit/:id" element={<ProgressionEditPage />} />
      </Route>

      <Route
        path="/objectives"
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ObjectiveList />} />
        <Route path="new" element={<NewObjective />} />
        <Route path="edit/:id" element={<ObjectiveEdit />} />
        <Route path=":id" element={<ObjectiveDetailPage />} />
      </Route>

      <Route
        path="/sequences"
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="new" element={<NewSequence />} />
        <Route path="new/:progressionId" element={<NewSequence />} />
        <Route path="edit/:id" element={<SequenceEdit />} />
        <Route path=":id/objectives/manage" element={<ManageSequenceObjectivesPage />} />
        <Route path=":id" element={<SequenceDetailPage />} /> {/* Doit être APRÈS /:id/objectives/manage */}
        {/* Temporairement désactivé en raison de problèmes d'importation */}
        <Route path=":id/propose-seances" element={<ProposeSeances />} />
        <Route path=":id/generate-summary" element={<SequenceSummaryResourcePage />} />
      </Route>

      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="new" element={<NewSession />} />
        <Route path="new/:sequenceId" element={<NewSession />} />
        <Route path="edit/:id" element={<SessionEdit />} />
        <Route path="/sessions/:id/build-fiche" element={<SessionFicheBuilderPage />} />
        <Route path=":id/generate-summary" element={<SessionSummaryResourcePage />} />
        <Route path=":id" element={<SessionDetailPage />} />
      </Route>

      <Route
        path="/study-objects"
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudyObjectList />} />
        <Route path="new" element={<NewStudyObject />} />
        <Route path="edit/:id" element={<EditStudyObject />} />
        <Route path=":id" element={<StudyObjectDetail />} />
        <Route path=":id/propose-works" element={<ProposeWorks />} />
      </Route>

      <Route
        path="/oeuvres"
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OeuvresList />} />
        <Route path="new" element={<NewOeuvre />} />
        <Route path="edit/:id" element={<EditOeuvre />} />
        <Route path=":id" element={<OeuvreDetail />} />
        <Route path="wizard" element={<OeuvreWizard />} />
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
