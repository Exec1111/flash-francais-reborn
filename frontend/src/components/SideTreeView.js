import React, { useRef, useState, useEffect } from 'react';
import { Drawer, IconButton, Box, Typography, useTheme, Tooltip, CircularProgress, Divider } from '@mui/material';
import { 
  ChevronLeft as ChevronLeftIcon, 
  Description as DescriptionIcon, 
  Checklist as ChecklistIcon,
  AccountTree as AccountTreeIcon,
  FormatListBulleted as FormatListBulletedIcon,
  Folder as FolderIcon, 
  Article as ArticleIcon, 
  OndemandVideo as VideoIcon, 
  FitnessCenter as ExerciseIcon 
} from '@mui/icons-material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view'; 
import ResourceButton from './resources/ResourceButton';
import { useAuth } from '../contexts/AuthContext';

export const drawerWidth = 480;  

function SideTreeView({ open, handleDrawerOpen, handleDrawerClose }) {
  const { user, token } = useAuth();
  const theme = useTheme();
  const [treeData, setTreeData] = useState({ id: 'root', name: 'Progressions', type: 'root', children: [] }); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const textRef = useRef(null);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const [expandedItems, setExpandedItems] = useState([]); 

  const checkTextTruncation = React.useCallback(() => {
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

  const findAndUpdateNodeImmutable = (nodes, nodeId, newChildren) => {
    return nodes.map(node => {
      if (node.id.toString() === nodeId.toString()) {
        console.log(`Updating children for node ${nodeId} immutably.`); 
        return { ...node, children: newChildren };
      } else if (node.children && node.children.length > 0) {
        const updatedChildren = findAndUpdateNodeImmutable(node.children, nodeId, newChildren);
        if (updatedChildren !== node.children) {
          return { ...node, children: updatedChildren };
        }
      }
      return node;
    });
  };

  const updateNodeChildrenImmutable = (nodeId, newChildren) => {
    setTreeData(prevData => {
      console.log(`Calling setTreeData after immutable update for ${nodeId}`);
      const updatedRootChildren = findAndUpdateNodeImmutable(prevData.children, nodeId, newChildren);
      if (updatedRootChildren !== prevData.children) {
        return { ...prevData, children: updatedRootChildren };
      } else {
        console.warn(`Node ${nodeId} not found or no change detected for immutable update.`);
        return prevData;
      }
    });
  };  

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!token) {
          throw new Error('No token available');
        }
        const response = await fetch('http://localhost:10000/api/v1/progressions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }); 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const progressions = await response.json();
        // Adapter les données reçues au format attendu par renderTree
        const formattedProgressions = progressions.map(prog => ({
          id: prog.id,
          name: prog.title, 
          type: 'progression', 
          description: prog.description,
          children: [{ id: `loading-${prog.id}`, name: 'Chargement...', type: 'loading' }]
        }));

        console.log("Données formatées pour TreeView:", formattedProgressions);
        setTreeData(prevData => ({ ...prevData, children: formattedProgressions }));
      } catch (e) {
        console.error("Erreur lors de la récupération des données de l'API:", e);
        setError('Impossible de charger les progressions.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token]); // Ajouter token aux dépendances

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

  const handleExpandedItemsChange = async (event, itemIds) => {
    setExpandedItems(itemIds);
    
    const oldExpandedIds = expandedItems;
    const newlyExpandedItemId = itemIds.find(id => !oldExpandedIds.includes(id));
    
    if (!newlyExpandedItemId) {
      // Un item a été replié, pas besoin de charger
      return;
    }

    console.log(`Expansion demandée pour l'ID: ${newlyExpandedItemId}`);

    // Trouver le nœud spécifique dans l'arbre actuel
    const nodeToExpand = findNodeInTree([treeData], newlyExpandedItemId);

    console.log('Node to expand found:', nodeToExpand);

    if (!nodeToExpand) {
      console.warn('Nœud à déplier non trouvé dans treeData');
      return;
    }

    // Vérifier si CE nœud spécifique a un enfant 'loading'
    const hasLoadingChild = nodeToExpand.children && nodeToExpand.children.some(child => child.type === 'loading');
    console.log(`Nœud ${nodeToExpand.id} (${nodeToExpand.type}) a un enfant loading: ${hasLoadingChild}`);

    if (!hasLoadingChild) {
      console.log('Pas d\'enfant loading à traiter pour ce nœud.');
      return; // Pas besoin de charger si pas d'enfant loading
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
            resource_type: res.type ? res.type.key : 'unknown', // Utiliser la clé ('text', 'image', etc.) ou fallback
            children: [] // Les ressources n'ont pas d'enfants
          }));
          console.log(`SÉANCE ${nodeId}. Chargement des ressources... URL: ${apiUrl}`);
          break;
        default:
          console.warn(`Type de nœud inconnu ou non chargeable: ${nodeType}`);
          return;
      }

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`Réponse reçue pour ${nodeType} ${nodeId}:`, response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Données brutes reçues pour ${nodeType} ${nodeId}:`, data);

      const formattedChildren = formatFunction(data);
      console.log(`Enfants formatés pour ${nodeType} ${nodeId}:`, formattedChildren);

      // Mettre à jour l'arbre de manière immuable
      updateNodeChildrenImmutable(nodeId, formattedChildren);

    } catch (error) {
      console.error(`Erreur lors du chargement des données pour ${nodeType} ${nodeId}:`, error);
      const errorNode = { id: `${errorChildIdPrefix}-${nodeId}`, name: errorChildName, type: 'error' };
      // Mettre à jour l'arbre de manière immuable avec le nœud d'erreur
      updateNodeChildrenImmutable(nodeId, [errorNode]);
    }
  };

  const renderTree = (nodes, currentExpandedItems) =>
    // Vérifier si nodes est bien un tableau avant de mapper
    Array.isArray(nodes) && nodes.map((node) => (
      <TreeItem
        key={node.id} // React key
        itemId={node.id.toString()} // Ensure itemId is a string
        // sx prop removed to show expand/collapse icons
        label={(
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between', // Rétablir l'alignement horizontal
              width: '100%', 
              p: 1, 
              overflow: 'hidden', 
            }}
          >
            <Tooltip 
              title={isTextTruncated ? node.name : ""} // Only show tooltip if truncated
              placement="bottom-start"
            >
              <Box 
                sx={{
                  flexGrow: 1,
                  overflow: 'hidden',
                }}
                ref={textRef} // Attach ref to the box containing the text
                onMouseEnter={checkTextTruncation} // Check truncation on hover
                onMouseLeave={() => setIsTextTruncated(false)} // Reset on leave
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
            {/* Icônes spécifiques au type de noeud */}
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}> {/* Container for icons */} 
              {node.type === 'progression' && (
                <FolderIcon sx={{ fontSize: 18, color: 'action.active' }} /> 
              )}
              {/* Icône Objectifs pour les séquences AVEC objectifs */} 
              {node.type === 'sequence' && Array.isArray(node.objectives) && node.objectives.length > 0 && (
                <Tooltip 
                  placement="right"
                  title={(
                    <Box sx={{ p: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Objectifs :</Typography>
                      {node.objectives.map((obj, index) => (
                        // Utiliser un Tooltip interne pour la description de chaque objectif
                        <Tooltip key={`obj-tooltip-${node.id}-${index}`} title={obj.description || ''} placement="top-start">
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            - {obj.title}
                          </Typography>
                        </Tooltip>
                      ))}
                    </Box>
                  )}
                >
                  {/* L'icône elle-même */} 
                  <ChecklistIcon sx={{ fontSize: 18, color: 'primary.main', ml: 0.5 }} />
                </Tooltip>
              )}
              {node.type === 'sequence' && (
                <AccountTreeIcon sx={{ fontSize: 18, color: 'action.active' }} />
              )}
              {node.type === 'seance' && (
                <FormatListBulletedIcon sx={{ fontSize: 18, color: 'action.active' }} />
              )}
              {/* Icône pour les ressources - spécifique au type */}
              {node.type === 'resource' && (
                (() => {
                  console.log(`Resource Node: ${node.name}, Type:`, node.resource_type); // DEBUG LOG
                  const iconProps = { sx: { fontSize: 18, color: 'action.active' } };
                  switch (node.resource_type?.toLowerCase()) {
                    case 'text':
                      return <DescriptionIcon {...iconProps} />;
                    case 'video':
                      return <VideoIcon {...iconProps} />;
                    case 'exercise':
                      return <ExerciseIcon {...iconProps} />;
                    // Add other cases like 'link', 'pdf' if needed
                    default:
                      return <ArticleIcon {...iconProps} />; // Default icon
                  }
                })()
              )}
              {/* Ne pas afficher d'icône pour le type 'loading' ou 'error' */} 
            </Box>
          </Box>
        )}
      >
        {/* Les enfants directs du TreeItem (loading ou enfants récursifs) */} 
        {/* Affichage conditionnel pendant le chargement ou pour les enfants normaux */}
        {Array.isArray(node.children) && node.children.length > 0 ? (
          // Afficher un indicateur de chargement si l'enfant est le noeud factice
          node.children.length === 1 && node.children[0].type === 'loading' ? (
            <Box sx={{ display: 'flex', alignItems: 'center', pl: 4, pt: 1, color: 'text.secondary' }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="caption">{node.children[0].name}</Typography>
            </Box>
          ) : (
            // Sinon, rendre les enfants récursivement
            renderTree(node.children, currentExpandedItems)
          )
        ) : null}
      </TreeItem>
    ));
  // Fin de renderTree

  // Appel initial pour les enfants directs de treeData
  const renderedTreeNodes = renderTree(treeData.children, expandedItems); // Passer expandedItems ici
 
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
      {/* En-tête du Drawer */}
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
        {/* Bouton pour fermer (ChevronLeftIcon) maintenant à gauche et plus visible */}
        <IconButton size="small" onClick={handleDrawerClose} color="primary">
          <ChevronLeftIcon sx={{ fontSize: '20px' }} />
        </IconButton>
      </Box>

      <Box sx={{ p: 2 }}>
        <ResourceButton />
      </Box>

      <Divider sx={{ my: 2 }} />

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
