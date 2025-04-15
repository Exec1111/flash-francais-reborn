import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import TreeNode from './TreeNode';

// Type d'élément pour le drag and drop
const ITEM_TYPE = 'PROGRESSION';

const DraggableProgressionNode = ({ node, index, moveNode, onExpand, ...props }) => {
  const ref = useRef(null);

  // Configuration du drag (glisser)
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { index, id: node.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Configuration du drop (déposer)
  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (item, monitor) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Ne rien faire si on glisse sur nous-mêmes
      if (dragIndex === hoverIndex) {
        return;
      }

      // Déterminer la position dans le rectangle (en haut ou en bas)
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Ne déplacer que si on dépasse la moitié de l'élément
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Effectuer le déplacement
      moveNode(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  // Initialiser les refs du drag et drop
  drag(drop(ref));

  return (
    <div 
      ref={ref}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      <TreeNode 
        node={node} 
        onExpand={onExpand}
        hideSequenceChildren={true} /* Empêche TreeNode d'afficher récursivement les séquences */
        {...props}
      />
    </div>
  );
};

export default DraggableProgressionNode;
