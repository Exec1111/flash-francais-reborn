import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { API_BASE_URL } from '../../services/api';

/**
 * Composant d'édition inline du titre d'une ressource
 * @param {Object} props
 * @param {string} props.title - Titre actuel de la ressource
 * @param {number} props.resourceId - ID de la ressource
 * @param {function} props.onSave - Callback appelé après sauvegarde réussie (resourceId, newTitle)
 * @param {Object} props.titleProps - Props optionnelles pour le Typography du titre
 * @param {function} props.onClick - Callback optionnel pour le clic sur le titre (non actif en mode édition)
 */
const InlineTitleEditor = ({ 
  title, 
  resourceId, 
  onSave, 
  titleProps = {},
  onClick
}) => {
  const displayTitle = title || 'Sans titre';
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(displayTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Debug
  React.useEffect(() => {
    console.log('[InlineTitleEditor] resourceId:', resourceId, 'title:', title, 'displayTitle:', displayTitle);
  }, [resourceId, title, displayTitle]);

  const handleStartEdit = (event) => {
    if (event) event.stopPropagation();
    setIsEditing(true);
    setEditedTitle(displayTitle);
    setError(null);
  };

  const handleCancel = (event) => {
    if (event) event.stopPropagation();
    setIsEditing(false);
    setEditedTitle(displayTitle);
    setError(null);
  };

  const handleSave = async (event) => {
    if (event) event.stopPropagation();
    
    // Validation
    if (!editedTitle.trim()) {
      setError('Le titre ne peut pas être vide');
      return;
    }

    if (editedTitle.trim() === displayTitle) {
      // Pas de changement
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Appel API pour mettre à jour le titre
      const token = localStorage.getItem('token');
      const apiUrl = `${API_BASE_URL}/api/v1/resources/${resourceId}`;
      console.log('[InlineTitleEditor] Calling API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editedTitle.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la mise à jour');
      }

      const updatedResource = await response.json();
      
      // Appeler le callback parent avec le nouveau titre
      if (onSave) {
        onSave(resourceId, updatedResource.title);
      }

      setIsEditing(false);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du titre:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleClick = (event) => {
    if (!isEditing && onClick) {
      onClick(event);
    }
  };

  if (isEditing) {
    return (
      <Box 
        sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <TextField
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          size="small"
          fullWidth
          autoFocus
          error={!!error}
          helperText={error}
          disabled={isSaving}
          sx={{ flexGrow: 1 }}
          inputProps={{
            onKeyDown: (e) => {
              // Empêcher la DataGrid d'intercepter les touches
              e.stopPropagation();
              
              // Gérer Enter et Escape
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave(e);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel(e);
              }
            }
          }}
        />
        <Tooltip title="Enregistrer">
          <span>
            <IconButton
              size="small"
              color="primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <CircularProgress size={20} /> : <CheckIcon />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Annuler">
          <IconButton
            size="small"
            color="default"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  console.log('[InlineTitleEditor RENDER] isEditing:', isEditing, 'displayTitle:', displayTitle);

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        width: '100%',
        '&:hover .edit-icon': {
          opacity: 1
        }
      }}
    >
      <Typography
        {...titleProps}
        onClick={handleTitleClick}
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...titleProps?.sx
        }}
      >
        {displayTitle}
      </Typography>
      <Tooltip title="Modifier le titre">
        <IconButton
          className="edit-icon"
          size="small"
          onClick={handleStartEdit}
          sx={{
            opacity: 0,
            transition: 'opacity 0.2s',
            ml: 'auto'
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default InlineTitleEditor;
