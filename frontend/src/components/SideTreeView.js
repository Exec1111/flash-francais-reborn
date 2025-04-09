import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Drawer, IconButton, Box, Typography, useTheme, Tooltip, CircularProgress, Divider, Button } from '@mui/material';
import { 
  ChevronLeft as ChevronLeftIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon, 
  ChevronRight, 
  Description as DescriptionIcon, 
  Checklist as ChecklistIcon,
  AccountTree as AccountTreeIcon,
  AddCircleOutline as AddIcon,
  FormatListBulleted as FormatListBulletedIcon,
  Folder as FolderIcon, 
  Article as ArticleIcon, 
  OndemandVideo as VideoIcon, 
  FitnessCenter as ExerciseIcon 
} from '@mui/icons-material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view'; 
import ResourceButton from './resources/ResourceButton';
import { useAuth } from '../contexts/AuthContext';
import { useTreeData } from '../contexts/TreeDataContext'; 
import api from '../services/api'; 
import { useNavigate, Link as RouterLink } from 'react-router-dom'; 

export const drawerWidth = 480;  

function SideTreeView({ open, handleDrawerOpen, handleDrawerClose }) {
  const { token } = useAuth(); 
  const { treeData, isTreeLoading: isLoading, treeError: error, refreshTreeData } = useTreeData(); 
  const theme = useTheme();
  const navigate = useNavigate(); 
  const textRef = useRef(null);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const [expandedItems, setExpandedItems] = useState([]); 
  const [internalTreeData, setInternalTreeData] = useState(treeData); 

  const checkTextTruncation = useCallback(() => {
    if (textRef.current) {
      const isOverflowing = textRef.current.scrollWidth > textRef.current.clientWidth;
      setIsTextTruncated(isOverflowing);
    }
  }, []);

  useEffect(() => {
    checkTextTruncation();
    const resizeObserver = new ResizeObserver(checkTextTruncation);
    if (textRef.current) {
      resizeObserver.observe(textRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [checkTextTruncation]);

  useEffect(() => {
    console.log("SideTreeView: Context treeData updated, updating internal state.", treeData);
    setInternalTreeData(treeData);
  }, [treeData]);

  const findNodeAndUpdate = (nodes, nodeId, newChildren) => {
    return nodes.map(node => {
      if (node.id.toString() === nodeId.toString()) {
        console.log(`Updating children for node ${nodeId} immutably.`); 
        return { ...node, children: newChildren };
      } else if (node.children && node.children.length > 0) {
        const updatedChildren = findNodeAndUpdate(node.children, nodeId, newChildren);
        if (updatedChildren !== node.children) {
          return { ...node, children: updatedChildren };
        }
      }
      return node;
    });
  };

  const updateNodeChildrenImmutable = useCallback((nodeId, newChildren) => {
    setInternalTreeData(prevData => {
      console.log(`Calling setTreeData after immutable update for ${nodeId}`);
      const updatedRootChildren = findNodeAndUpdate(prevData.children, nodeId, newChildren);
      if (updatedRootChildren !== prevData.children) {
        return { ...prevData, children: updatedRootChildren };
      } else {
        console.warn(`Node ${nodeId} not found or no change detected for immutable update.`);
        return prevData;
      }
    });
  }, [findNodeAndUpdate]);  

  const handleExpandedItemsChange = useCallback(async (event, itemIds) => {
    setExpandedItems(itemIds);
    
    const oldExpandedIds = expandedItems;
    const newlyExpandedItemId = itemIds.find(id => !oldExpandedIds.includes(id));
    
    if (!newlyExpandedItemId) {
      return;
    }

    console.log(`Expansion demandée pour l'ID: ${newlyExpandedItemId}`);

    const nodeToExpand = findNodeInTree(internalTreeData.children, newlyExpandedItemId); 

    console.log('Node to expand found:', nodeToExpand);

    if (!nodeToExpand) {
      console.warn('Nœud à déplier non trouvé dans treeData');
      return;
    }

    const hasLoadingChild = nodeToExpand.children && nodeToExpand.children.some(child => child.type === 'loading');
    console.log(`Nœud ${nodeToExpand.id} (${nodeToExpand.type}) a un enfant loading: ${hasLoadingChild}`);

    if (!hasLoadingChild) {
      console.log('Pas d\'enfant loading à traiter pour ce nœud.');
      return; 
    }

    const nodeId = nodeToExpand.id;
    const nodeType = nodeToExpand.type;
    let apiUrl = '';
    let formatFunction = null;
    let loadingChildIdPrefix = '';
    let errorChildIdPrefix = '';
    let errorChildName = '';

    try {
      if (!token) {
        throw new Error('No token available');
      }

      switch (nodeType) {
        case 'progression':
          apiUrl = `http://localhost:10000/api/v1/sequences/by_progression/${nodeId}`;
          loadingChildIdPrefix = 'loading-ses';
          errorChildIdPrefix = 'error-seq';
          errorChildName = 'Erreur chargement séquences';
          formatFunction = (sequences) => sequences.map(seq => ({
            id: seq.id,
            name: seq.title,
            type: 'sequence',
            description: seq.description,
            objectives: seq.objectives || [], 
            children: [{ id: `${loadingChildIdPrefix}-${seq.id}`, name: 'Chargement séances...', type: 'loading' }]
          }));
          console.log(`PROGRESSION ${nodeId}. Chargement des séquences... URL: ${apiUrl}`);
          break;
        case 'sequence':
          apiUrl = `http://localhost:10000/api/v1/sessions/by_sequence/${nodeId}`;
          loadingChildIdPrefix = 'loading-res';
          errorChildIdPrefix = 'error-ses';
          errorChildName = 'Erreur chargement séances';
          formatFunction = (sessions) => sessions.map(session => ({
            id: session.id,
            name: session.title || `Séance ${session.id}`,
            type: 'seance',
            children: [{ id: `${loadingChildIdPrefix}-${session.id}`, name: 'Chargement ressources...', type: 'loading' }]
          }));
          console.log(`SÉQUENCE ${nodeId}. Chargement des séances... URL: ${apiUrl}`);
          break;
        case 'seance':
          apiUrl = `http://localhost:10000/api/v1/resources/by_session/${nodeId}`;
          errorChildIdPrefix = 'error-res';
          errorChildName = 'Erreur chargement ressources';
          formatFunction = (resources) => resources.map(res => ({
            id: res.id,
            name: res.title || `Ressource ${res.id}`,
            type: 'resource',
            url: res.description,
            resource_type: res.type ? res.type.key : 'unknown', 
            children: [] 
          }));
          console.log(`SÉANCE ${nodeId}. Chargement des ressources... URL: ${apiUrl}`);
          break;
        default:
          console.warn(`Type de nœud inconnu ou non chargeable: ${nodeType}`);
          return;
      }

      const response = await api.get(apiUrl);
      console.log(`Réponse reçue pour ${nodeType} ${nodeId}:`, response.status);

      const data = response.data;
      console.log(`Données brutes reçues pour ${nodeType} ${nodeId}:`, data);

      const formattedChildren = formatFunction(data);
      console.log(`Enfants formatés pour ${nodeType} ${nodeId}:`, formattedChildren);

      updateNodeChildrenImmutable(nodeId, formattedChildren);

    } catch (error) {
      console.error(`Erreur lors du chargement des données pour ${nodeType} ${nodeId}:`, error);
      const errorNode = { id: `${errorChildIdPrefix}-${nodeId}`, name: errorChildName, type: 'error' };
      updateNodeChildrenImmutable(nodeId, [errorNode]);
    }
  }, [token, expandedItems, updateNodeChildrenImmutable]);  

  const findNodeInTree = (nodes, id) => {
    if (!nodes) return null;
    for (const node of nodes) {
      if (node.id.toString() === id.toString()) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeInTree(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleEdit = (nodeId) => {
    console.log('[SideTreeView] Navigating to edit progression ID:', nodeId, 'Path:', `/progressions/edit/${nodeId}`); // Log de diagnostic
    navigate(`/progressions/edit/${nodeId}`);
  };

  const handleDelete = async (nodeId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette progression et tout son contenu ?")) {
      try {
        console.log(`Attempting to delete progression ${nodeId}`);
        await api.delete(`/progressions/${nodeId}`, { headers: { Authorization: `Bearer ${token}` } });
        console.log(`Progression ${nodeId} deleted successfully.`);
        refreshTreeData(); 
      } catch (err) {
        console.error("Erreur lors de la suppression de la progression:", err);
      }
    }
  };

  const renderTree = useCallback((nodes, currentExpandedItems) => (
    nodes.map((node) => (
      <TreeItem 
        key={node.id} 
        itemId={node.id.toString()} 
        label={(
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Tooltip 
              title={isTextTruncated ? node.name : ""} 
              placement="bottom-start"
            >
              <Box 
                ref={textRef} 
                sx={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  flexGrow: 1, 
                  mr: 1 
                }}
              > 
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {node.name}
                </Typography>
              </Box>
            </Tooltip>
            {node.type === 'progression' && (
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', flexShrink: 0 }}> 
                <IconButton 
                  size="small" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleEdit(node.id); 
                  }}
                  aria-label={`Modifier la progression ${node.label}`}
                >
                  <EditIcon fontSize="inherit" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleDelete(node.id); 
                  }}
                  aria-label={`Supprimer la progression ${node.label}`}
                >
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              </Box>
            )}
          </Box>
        )}
      >
        {node.isLoading ? (
          <CircularProgress size={16} sx={{ ml: 1 }} />
        ) : node.children && node.children.length > 0 && expandedItems.includes(node.id.toString()) ? (
          renderTree(node.children, currentExpandedItems)
        ) : null}
      </TreeItem>
    ))
  ), []); 
 
  const renderedTreeNodes = renderTree(internalTreeData.children, expandedItems); 
  
  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          top: '64px', 
          height: 'calc(100% - 64px)',
        },
      }}
      variant="persistent"
      anchor="left"
      open={open}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: theme.spacing(0, 1), 
          minHeight: '32px', 
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <IconButton size="small" onClick={handleDrawerClose} color="primary">
          <ChevronLeftIcon sx={{ fontSize: '20px' }} />
        </IconButton>
      </Box>

      <Box sx={{ p: 2 }}>
        <ResourceButton />
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          color="secondary" 
          startIcon={<AddIcon />}
          component={RouterLink}
          to="/progressions/new" 
        >
          Nouvelle Progression
        </Button>
      </Box>

      <Box sx={{ overflow: 'auto', height: 'calc(100vh - 120px)' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <SimpleTreeView
            aria-label="progressions tree"
            sx={{ flexGrow: 1, width: '100%', overflowY: 'auto', padding: 1 }} 
            expanded={expandedItems} 
            onExpandedItemsChange={handleExpandedItemsChange} 
          >
            {renderedTreeNodes} 
          </SimpleTreeView>
        )}
      </Box>
    </Drawer>
  );
}

export default SideTreeView;
