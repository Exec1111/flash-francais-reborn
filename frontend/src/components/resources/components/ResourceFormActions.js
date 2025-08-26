import React from 'react';
import { Button, CircularProgress } from '@mui/material';

/**
 * Component for resource form action buttons (Submit/Cancel)
 */
const ResourceFormActions = ({
  isDialog,
  onClose,
  navigate,
  submitting,
  missingSubtype,
  handleSubmit,
  isEdit
}) => {
  return (
    <>
      <Button
        onClick={isDialog ? onClose : () => navigate(-1)}
        color="secondary"
        disabled={submitting}
      >
        Annuler
      </Button>
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={submitting || missingSubtype}
        onClick={handleSubmit}
      >
        {submitting ? <CircularProgress size={24} /> : (isEdit ? 'Mettre à jour' : 'Créer')}
      </Button>
    </>
  );
};

export default ResourceFormActions;