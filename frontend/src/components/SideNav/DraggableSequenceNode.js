import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import TreeNode from './TreeNode';
import DraggableSessionNode from './DraggableSessionNode';

// Type d'élément pour le drag and drop des séquences
const ITEM_TYPE = 'SEQUENCE';

const DraggableSequenceNode = ({ 
  node, 
  index, 
  progressionId, 
  moveNode, 
  moveSessionNode, // Fonction pour déplacer les séances
  isReordering,
  onExpand,
  onAddSession,
  onDeleteSequence,
  onEditSequence,
  onDeleteSession,
  loadingNodeId,
}) => {
  const ref = useRef(null);

  // Configuration du drag (glisser)
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { 
      index, 
      id: node.id, 
      progressionId // Identifiant de la progression parent (crucial pour limiter le drag-and-drop)
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Configuration du drop (déposer)
  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (item, monitor) => {
      // Ne pas permettre le drag-and-drop entre progressions différentes
      if (item.progressionId !== progressionId) {
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
        paddingLeft: '16px', // Indentation supplémentaire pour les séquences
      }}
    >
      {/* Pas d'indicateur visuel séparé, utilisons juste TreeNode */}
      
      {/* Utiliser TreeNode pour le rendu du contenu, mais pas pour le drag-and-drop */}
      <div>
        {/* Utiliser TreeNode pour afficher le contenu de la séquence, mais empêcher l'affichage des séances */}
        <TreeNode
          node={node}
          onExpand={onExpand}
          onAddSession={onAddSession}
          onDeleteSequence={onDeleteSequence}
          onEditSequence={onEditSequence}
          onDeleteSession={onDeleteSession}
          loadingNodeId={loadingNodeId}
          hideSessionChildren={true} /* Empêcher TreeNode d'afficher récursivement les séances */
        />
        
        {/* Afficher les séances enfants avec drag-and-drop */}
        {node.isExpanded && node.children && 
          node.children
            .filter(child => child.type === 'session')
            .map((session, sessionIndex) => (
              <DraggableSessionNode
                key={session.id}
                node={session}
                index={sessionIndex}
                sequenceId={node.id} /* Pour limiter le drag-and-drop à cette séquence */
                moveNode={(fromIndex, toIndex) => 
                  moveSessionNode ? moveSessionNode(node.id, fromIndex, toIndex) : null
                }
                isReordering={isReordering}
                onExpand={onExpand}
                loadingNodeId={loadingNodeId}
              />
            ))
        }
      </div>
    </div>
  );
};

export default DraggableSequenceNode;
