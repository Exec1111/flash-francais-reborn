import React, { useState, useEffect, useCallback } from 'react';
import { Drawer, IconButton, Box, Typography, useTheme, CircularProgress, Divider, Button } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, Flag as FlagIcon } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTreeData } from '../../contexts/TreeDataContext';
import api from '../../services/api';
import ResourceButton from '../resources/ResourceButton';
import TreeNode from './TreeNode';
import DraggableProgressionNode from './DraggableProgressionNode';
import { updateNodeStateRecursive, transformNode } from './utils';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Définir la largeur du drawer
export const drawerWidth = 480;

// Composant principal SideNav
function SideNav({ open, handleDrawerOpen, handleDrawerClose }) {
  const { token } = useAuth();
  const { treeData, isTreeLoading, treeError, refreshTreeData } = useTreeData();
  const theme = useTheme();
  const navigate = useNavigate();

  // État local pour les nœuds transformés avec état d'expansion
  const [processedNodes, setProcessedNodes] = useState([]);
  
  // État pour indiquer qu'une réorganisation est en cours
  const [isReordering, setIsReordering] = useState(false);

  // État de chargement pour les enfants des nœuds
  const [loadingNodeId, setLoadingNodeId] = useState(null);

  // Fonction pour trier les progressions par la colonne 'order'
  const sortNodesByOrder = useCallback((nodes) => {
    if (!nodes) return [];
    
    return [...nodes].sort((a, b) => {
      // Si les deux nœuds ont un ordre défini, trier par ordre
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // Si seulement un nœud a un ordre défini, le mettre en premier
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      // Par défaut, trier par ID
      return a.id - b.id;
    });
  }, []);

  // Transformer les données brutes en structure avec état d'expansion
  useEffect(() => {
    if (treeData && treeData.children) {
      console.log('Progressions reçues (treeData.children, détail par progression) :');
      treeData.children.forEach((prog, idx) => {
        console.log(`Progression[${idx}] :`, prog, 'Propriétés :', Object.keys(prog));
      });
      // Trier les progressions par 'order' avant de les transformer
      const sortedNodes = sortNodesByOrder(treeData.children);
      console.log('Progressions triées (sortedNodes) :', sortedNodes);
      setProcessedNodes(sortedNodes.map((node, index) => transformNode(node, index)));
    }
  }, [treeData, sortNodesByOrder]);

  // Gérer l'expansion/la fermeture d'un nœud
  const handleToggleExpand = useCallback(async (nodeToToggle) => {
    const nodeId = nodeToToggle.id;

    // Mettre à jour l'état d'expansion immédiatement pour la réactivité de l'UI
    setProcessedNodes(prevNodes =>
      updateNodeStateRecursive(prevNodes, nodeId, { isExpanded: !nodeToToggle.isExpanded })
    );

    // Si on déplie le nœud et qu'il a un enfant de type 'loading', charger les enfants
    if (!nodeToToggle.isExpanded && nodeToToggle.children && nodeToToggle.children.some(child => child.type === 'loading')) {
      // Déclarer les variables ici pour qu'elles soient accessibles dans le catch
      const nodeType = nodeToToggle.type;
      // Corriger l'extraction de l'ID original
      const originalId = nodeId.startsWith(`${nodeType}_`) ? nodeId.substring(nodeType.length + 1) : nodeId;

      try {
        setLoadingNodeId(nodeId);

        // Déterminer l'URL et le format des données en fonction du type de nœud
        let apiUrl = '';
        let formatFunction;

        switch (nodeType) {
          case 'progression':
            apiUrl = `/sequences/by_progression/${originalId}`;
            formatFunction = (sequences) => sequences.map(seq => ({
              id: `sequence_${seq.id}`,
              originalId: seq.id,
              name: seq.title,
              type: 'sequence',
              description: seq.description,
              objectives: seq.objectives || [],
              isExpanded: false,
              children: [{ id: `loading-${seq.id}`, type: 'loading' }]
            }));
            break;
          case 'sequence':
            apiUrl = `/sessions/by_sequence/${originalId}`;
            formatFunction = (sessions) => sessions.map(session => ({
              id: `session_${session.id}`,
              originalId: session.id,
              name: session.title || `Séance ${session.id}`,
              type: 'session',
              objectives: session.objectives || [], // Ajouter les objectifs ici
              isExpanded: false,
              // Conserver le loading pour les ressources
              children: [{ id: `loading-${session.id}`, type: 'loading' }]
            }));
            break;
          case 'session':
            apiUrl = `/resources/by_session/${originalId}`;
            formatFunction = (resources) => resources.map(res => ({
              id: `resource_${res.id}`,
              originalId: res.id,
              name: res.title || `Ressource ${res.id}`,
              type: 'resource',
              url: res.description,
              resource_type: res.type ? res.type.key : 'unknown',
              isExpanded: false,
              children: []
            }));
            break;
          default:
            console.warn(`Type de nœud non pris en charge pour le chargement: ${nodeType}`);
            setLoadingNodeId(null);
            // Supprimer l'enfant 'loading' si le type n'est pas géré
            setProcessedNodes(prevNodes =>
              updateNodeStateRecursive(prevNodes, nodeId, { children: [] })
            );
            return;
        }

        console.log(`Chargement des données pour ${nodeType} ${originalId}... URL: ${apiUrl}`);

        // Récupérer le token depuis localStorage si nécessaire
        const authToken = token || localStorage.getItem('token');

        if (!authToken) {
          throw new Error('Token d\'authentification manquant');
        }

        // Appel API pour charger les enfants
        const response = await api.get(apiUrl, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        // Formater les données
        const formattedChildren = formatFunction(response.data);

        // Mettre à jour l'arbre avec les nouvelles données
        setProcessedNodes(prevNodes =>
          updateNodeStateRecursive(prevNodes, nodeId, { children: formattedChildren })
        );
      } catch (error) {
        console.error(`Erreur lors du chargement des données pour ${nodeType} ${originalId}:`, error);

        // Créer un nœud d'erreur
        const errorNode = {
          id: `error-${Date.now()}`,
          name: error.message || "Erreur de chargement",
          type: 'error',
          isExpanded: false,
          children: []
        };

        // Mettre à jour l'arbre avec le nœud d'erreur
        setProcessedNodes(prevNodes =>
          updateNodeStateRecursive(prevNodes, nodeId, { children: [errorNode] })
        );
      } finally {
        setLoadingNodeId(null);
      }
    }
  }, [token]);

  // Gérer l'ajout d'une séquence
  const handleAddSequence = (progressionNodeId) => {
    const progressionId = progressionNodeId.replace(/^progression_/, '');
    navigate(`/sequences/new/${progressionId}`);
  };

  // Gérer la suppression d'une séquence
  const handleDeleteSequence = async (nodeId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette séquence ?')) {
      return;
    }

    setLoadingNodeId(nodeId);
    try {
      const token = localStorage.getItem('token');
      const originalId = nodeId.startsWith('sequence_') ? nodeId.substring(9) : nodeId;
      await api.delete(`/sequences/${originalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshTreeData();
    } catch (error) {
      console.error('Erreur lors de la suppression de la séquence:', error);
    } finally {
      setLoadingNodeId(null);
    }
  };

  // Gérer la suppression d'une progression
  const handleDeleteProgression = async (nodeId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette progression et toutes ses séquences associées ?')) {
      return;
    }

    setLoadingNodeId(nodeId);
    try {
      const token = localStorage.getItem('token');
      const originalId = nodeId.startsWith('progression_') ? nodeId.substring(12) : nodeId;
      await api.delete(`/progressions/${originalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshTreeData();
    } catch (error) {
      console.error('Erreur lors de la suppression de la progression:', error);
    } finally {
      setLoadingNodeId(null);
    }
  };

  // Gérer l'édition d'une progression
  const handleEditProgression = (progressionNodeId) => {
    const progressionId = progressionNodeId.replace(/^progression_/, '');
    navigate(`/progressions/edit/${progressionId}`);
  };

  // Gérer l'édition d'une séquence
  const handleEditSequence = (sequenceNodeId) => {
    const sequenceId = sequenceNodeId.replace(/^sequence_/, '');
    navigate(`/sequences/edit/${sequenceId}`);
  };

  // Gérer l'ajout d'une séance à une séquence
  const handleAddSession = (sequenceNodeId) => {
    const sequenceId = sequenceNodeId.replace(/^sequence_/, '');
    navigate(`/sessions/new/${sequenceId}`);
  };

  // Gérer la suppression d'une séance
  const handleDeleteSession = async (sessionNodeId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette séance ?')) {
      return;
    }

    setLoadingNodeId(sessionNodeId);
    try {
      const token = localStorage.getItem('token');
      const originalId = sessionNodeId.startsWith('session_') ? sessionNodeId.substring(8) : sessionNodeId;
      await api.delete(`/sessions/${originalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshTreeData();
    } catch (error) {
      console.error('Erreur lors de la suppression de la séance:', error);
    } finally {
      setLoadingNodeId(null);
    }
  };

  // Déplacer un nœud de progression d'une position à une autre
  const moveProgressionNode = useCallback(async (fromIndex, toIndex) => {
    setIsReordering(true);
    
    try {
      // Construire la nouvelle liste réordonnée localement
      const newNodes = [...processedNodes];
      const [removed] = newNodes.splice(fromIndex, 1);
      newNodes.splice(toIndex, 0, removed);
      // Mettre à jour les index/order
      const updatedNodes = newNodes.map((node, index) => ({
        ...node,
        order: index,
        index: index
      }));
      // Mettre à jour l'état avec la nouvelle liste
      setProcessedNodes(updatedNodes);
      // Préparer la liste des IDs à envoyer à l'API
      const orderList = updatedNodes.map(node => node.originalId);
      console.log('Nouvel ordre envoyé à l\'API (orderList) :', orderList);
      // Appel API pour mettre à jour l'ordre des progressions dans la base de données
      const authToken = token || localStorage.getItem('token');
      await api.patch('/progressions/reorder', orderList, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      // Rafraîchir les données après la mise à jour (optionnel)
      // await refreshTreeData();
    } catch (error) {
      console.error('Erreur lors de la réorganisation des progressions:', error);
      // En cas d'erreur, rafraîchir les données pour restaurer l'ordre correct
      await refreshTreeData();
    } finally {
      setIsReordering(false);
    }
  }, [processedNodes, token, refreshTreeData]);

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
      {/* En-tête du drawer */}
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

      {/* Boutons de ressources et objectifs */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <ResourceButton />

        <Button
          variant="outlined"
          color="primary"
          startIcon={<FlagIcon />}
          component={RouterLink}
          to="/objectives"
          fullWidth
          sx={{ justifyContent: 'flex-start' }}
        >
          Objectifs pédagogiques
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Contenu principal du drawer - l'arbre de navigation */}
      <Box sx={{ overflow: 'auto', flexGrow: 1, p: 1 }}>
        {isTreeLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress />
          </Box>
        ) : treeError ? (
          <Box sx={{ p: 2 }}>
            <Typography color="error">{treeError}</Typography>
          </Box>
        ) : (
          <DndProvider backend={HTML5Backend}>
            <div>
              {processedNodes.length > 0 ? (
                processedNodes.map((node, index) => 
                  node.type === 'progression' ? (
                    <DraggableProgressionNode
                      key={node.id}
                      node={node}
                      index={index}
                      moveNode={moveProgressionNode}
                      onExpand={handleToggleExpand}
                      onAddSequence={handleAddSequence}
                      onEdit={handleEditProgression}
                      onDelete={handleDeleteProgression}
                      onDeleteSequence={handleDeleteSequence}
                      onEditSequence={handleEditSequence}
                      onAddSession={handleAddSession}
                      onDeleteSession={handleDeleteSession}
                      loadingNodeId={loadingNodeId}
                    />
                  ) : (
                    <TreeNode
                      key={node.id}
                      node={node}
                      onExpand={handleToggleExpand}
                      onAddSequence={handleAddSequence}
                      onEdit={handleEditProgression}
                      onDelete={handleDeleteProgression}
                      onDeleteSequence={handleDeleteSequence}
                      onEditSequence={handleEditSequence}
                      onAddSession={handleAddSession}
                      onDeleteSession={handleDeleteSession}
                      loadingNodeId={loadingNodeId}
                    />
                  )
                )
              ) : (
                <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                  Aucune progression trouvée.
                </Typography>
              )}
              {isReordering && (
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  <Typography variant="body2">Mise à jour de l'ordre...</Typography>
                </Box>
              )}
            </div>
          </DndProvider>
        )}
      </Box>
    </Drawer>
  );
}

export default SideNav;
