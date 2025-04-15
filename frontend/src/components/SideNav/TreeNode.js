import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import NodeContent from './NodeContent';

const TreeNode = ({ node, level = 0, onExpand, onAddSequence, onEdit, onDelete, onDeleteSequence, onEditSequence, onAddSession, onDeleteSession, loadingNodeId, hideSequenceChildren = false }) => {
  return (
    <div>
      {/* Contenu du nœud */}
      <Box
        sx={{
          pl: level * 2,
          borderLeft: level > 0 ? '1px dashed rgba(0,0,0,0.1)' : 'none',
          mb: 0.5
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
              // Ne pas afficher les séquences comme enfants si hideSequenceChildren est true
              .filter(child => !hideSequenceChildren || child.type !== 'sequence')
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
