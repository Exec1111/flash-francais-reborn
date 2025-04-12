import React from 'react';
import SequenceForm from './sequences/SequenceForm';

/**
 * Composant de dialogue pour créer/modifier des séquences
 * Ce composant est utilisé par SideTreeView pour créer de nouvelles séquences
 * à partir d'une progression.
 */
const SequenceDialog = ({ 
  open, 
  onClose, 
  progressionId,
  isEdit = false,
  sequenceId = null, 
  initialData = null,
  onSuccess 
}) => {
  return (
    <SequenceForm
      open={open}
      onClose={onClose}
      isDialog={true}
      progressionId={progressionId}
      isEdit={isEdit}
      sequenceId={sequenceId}
      initialData={initialData}
      onSuccess={onSuccess}
    />
  );
};

export default SequenceDialog;
