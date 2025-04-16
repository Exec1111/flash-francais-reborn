import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import NodeContent from './NodeContent';

const TreeNode = ({ node, level = 0, onExpand, onAddSequence, onEdit, onDelete, onDeleteSequence, onEditSequence, onAddSession, onDeleteSession, loadingNodeId, hideSequenceChildren = false, hideSessionChildren = false, activeNodeType, activeNodeId }) => {
  // Détection du nœud actif
  // DEBUG temporaire
  if (node.type === 'progression') {
    console.log('[DEBUG TreeNode] node.id:', node.id, 'node.type:', node.type, '| activeNodeId:', activeNodeId, 'activeNodeType:', activeNodeType);
  }
  // Correction : extraire la partie numérique de node.id si besoin
  const extractId = id => {
    if (typeof id === 'string' && id.includes('_')) {
      return id.split('_').pop();
    }
    return String(id);
  };
  const isActive = node.type === activeNodeType && extractId(node.id) === String(activeNodeId);

  return (
    <div>
      {/* Contenu du nœud */}
      <Box
        sx={{
          pl: level * 2,
          borderLeft: level > 0 ? '1px dashed rgba(0,0,0,0.1)' : 'none',
          mb: 0.5,
          backgroundColor: isActive ? '#1976d2' : 'inherit', // Couleur d'accent forte
          color: isActive ? '#fff' : 'inherit',
          fontWeight: isActive ? 'bold' : 'normal',
          border: isActive ? '2.5px solid #1565c0' : 'none',
          boxShadow: isActive ? '0 0 0 2px #90caf9' : 'none',
          borderRadius: isActive ? 2 : 0,
        }}
      >
        <NodeContent
          node={node}
          onExpand={onExpand}
          onAddSequence={onAddSequence}
          onEdit={onEdit}
          onDelete={onDelete}
          onDeleteSequence={onDeleteSequence}
          onEditSequence={onEditSequence}
          onAddSession={onAddSession}
          onDeleteSession={onDeleteSession}
        />
      </Box>
      {/* Enfants du nœud */}
      {node.isExpanded && (
        <div>
          {loadingNodeId === node.id ? (
            <Box sx={{ pl: (level + 1) * 2, py: 1, display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="body2">Chargement...</Typography>
            </Box>
          ) : (
            node.children && node.children
              // Filtrer selon les paramètres hideSequenceChildren et hideSessionChildren
              .filter(child => 
                (!hideSequenceChildren || child.type !== 'sequence') && 
                (!hideSessionChildren || child.type !== 'session')
              )
              .map((child) => (
                child.type === 'error' ? (
                  <Typography key={child.id} color="error" sx={{ pl: (level + 1) * 2, py: 1 }}>
                    {child.name}
                  </Typography>
                ) :
                child.type === 'loading' ? (
                  <Box key={child.id} sx={{ pl: (level + 1) * 2, py: 1, display: 'flex', alignItems: 'center' }}>
                    {/* Placeholder loading */}
                  </Box>
                ) : (
                  <TreeNode
                    key={child.id}
                    node={child}
                    level={level + 1}
                    onExpand={onExpand}
                    onAddSequence={onAddSequence}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDeleteSequence={onDeleteSequence}
                    onEditSequence={onEditSequence}
                    onAddSession={onAddSession}
                    onDeleteSession={onDeleteSession}
                    loadingNodeId={loadingNodeId}
                    hideSequenceChildren={hideSequenceChildren}
                    hideSessionChildren={hideSessionChildren}
                    activeNodeType={activeNodeType}
                    activeNodeId={activeNodeId}
                  />
                )
              ))
          )}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
