import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import TreeNode from './TreeNode';
import { Box } from '@mui/material';

// Type d'élément pour le drag and drop des séances
const ITEM_TYPE = 'SESSION';

const DraggableSessionNode = ({ 
  node, 
  index, 
  sequenceId, 
  moveNode, 
  isReordering,
  onExpand,
  loadingNodeId,
  activeNodeType,
  activeNodeId,
}) => {
  const ref = useRef(null);

  // Configuration du drag (glisser)
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { 
      index, 
      id: node.id, 
      sequenceId // Identifiant de la séquence parent (crucial pour limiter le drag-and-drop)
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Configuration du drop (déposer)
  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (item, monitor) => {
      // Ne pas permettre le drag-and-drop entre séquences différentes
      if (item.sequenceId !== sequenceId) {
        return;
      }

      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Ne rien faire si on glisse sur nous-mêmes
      if (dragIndex === hoverIndex) return;

      // Déterminer la position dans le rectangle
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Ne déplacer que si on dépasse la moitié de l'élément
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      // Effectuer le déplacement
      moveNode(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  // Initialiser les refs pour le drag and drop
  drag(drop(ref));

  // Utiliser TreeNode pour l'affichage, mais avec une référence pour le drag-and-drop
  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isReordering ? "not-allowed" : "grab",
        position: 'relative',
        paddingLeft: '8px', // Correction : moins d'indentation pour aligner les séances avec les séquences
      }}
    >
      {/* Utiliser TreeNode pour le rendu du contenu, mais pas pour le drag-and-drop */}
      <TreeNode
        node={node}
        onExpand={onExpand}
        loadingNodeId={loadingNodeId}
        level={2}
        hideSessionChildren={true}
        activeNodeType={activeNodeType}
        activeNodeId={activeNodeId}
      />
    </div>
  );
};

export default DraggableSessionNode;
