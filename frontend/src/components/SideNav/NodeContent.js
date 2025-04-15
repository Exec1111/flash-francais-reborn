import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ChevronRight as ChevronRightIcon, Edit as EditIcon, Delete as DeleteIcon, AddCircleOutline as AddIcon, InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NodeContent = ({ node, onExpand, onAddSequence, onEdit, onDelete, onDeleteSequence, onEditSequence, onAddSession, onDeleteSession }) => {
  const navigate = useNavigate();

  // Gestion des clics sur les boutons d'action
  const handleAddSequence = (e) => {
    e.stopPropagation();
    onAddSequence(node.id);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(node.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(node.id);
  };

  // Navigation pour les progressions
  const handleProgressionNavigate = (event) => {
    event.stopPropagation();
    const progressionId = node.id.toString().split('_').pop();
    navigate(`/progressions/${progressionId}`);
  };

  const handleSequenceNavigate = (event) => {
    event.stopPropagation();
    const sequenceId = node.id.toString().split('_').pop();
    navigate(`/sequences/${sequenceId}`);
  };

  const handleSessionNavigate = (event) => {
    event.stopPropagation();
    const sessionId = node.id.toString().split('_').pop();
    navigate(`/sessions/${sessionId}`);
  };

  // Fonction pour la navigation vers les ressources
  const handleResourceNavigate = (event) => {
    event.stopPropagation();
    const resourceId = node.id.toString().split('_').pop();
    navigate(`/resources/view/${resourceId}`);
  };

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      p: 0.5,
      px: 1,
      width: '100%',
      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
    }}>
      {/* Icône d'expansion */}
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onExpand(node);
        }}
        sx={{ mr: 1, p: 0.5 }}
      >
        {node.isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </IconButton>
      {/* Nom du nœud */}
      <Tooltip title={node.name} placement="bottom-start">
        <Typography
          variant="body2"
          noWrap
          onClick={
            node.type === 'progression' ? handleProgressionNavigate :
            node.type === 'sequence' ? handleSequenceNavigate :
            node.type === 'session' ? handleSessionNavigate :
            node.type === 'resource' ? handleResourceNavigate :
            null
          }
          sx={{
            flexGrow: 1,
            cursor: ['progression', 'sequence', 'session', 'resource'].includes(node.type) ? 'pointer' : 'default',
            ...(['progression', 'sequence', 'session', 'resource'].includes(node.type) && {
              '&:hover': {
                textDecoration: 'underline',
              },
            }),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.name}
        </Typography>
      </Tooltip>
      {/* Aucune icône supplémentaire nécessaire pour les progressions, 
          car le clic sur le nom permet déjà d'y accéder */}
      {/* Boutons d'action pour les progressions */}
      {node.type === 'progression' && (
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
          <IconButton
            size="small"
            color="success"
            onClick={handleAddSequence}
            aria-label={`Ajouter une séquence à ${node.name}`}
            title="Ajouter une séquence"
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleEdit}
            aria-label={`Modifier la progression ${node.name}`}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleDelete}
            aria-label={`Supprimer la progression ${node.name}`}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      {/* Boutons d'action pour les séquences */}
      {node.type === 'sequence' && (
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
          {/* Icône et Tooltip pour les objectifs */}
          {node.objectives && node.objectives.length > 0 && (
            <Tooltip
              title={
                <React.Fragment>
                  <Typography color="inherit" variant="subtitle2">Objectifs:</Typography>
                  <ul style={{ margin: 0, paddingLeft: '16px', listStyle: 'disc' }}>
                    {node.objectives.map(obj => (
                      <li key={obj.id}>{obj.title}</li>
                    ))}
                  </ul>
                </React.Fragment>
              }
              arrow
              placement="top"
            >
              <IconButton
                size="small"
                sx={{ mr: 0.5 }}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Voir les objectifs de ${node.name}`}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          <IconButton
            size="small"
            color="success"
            onClick={(e) => {
              e.stopPropagation();
              onAddSession(node.id);
            }}
            aria-label={`Ajouter une séance à ${node.name}`}
            title="Ajouter une séance"
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEditSequence(node.id);
            }}
            aria-label={`Modifier la séquence ${node.name}`}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSequence(node.id);
            }}
            aria-label={`Supprimer la séquence ${node.name}`}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      
      {/* Boutons d'action pour les séances */}
      {node.type === 'session' && (
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
          {/* Icône et Tooltip pour les objectifs de la séance */}
          {node.objectives && node.objectives.length > 0 && (
            <Tooltip
              title={
                <React.Fragment>
                  <Typography color="inherit" variant="subtitle2">Objectifs:</Typography>
                  <ul style={{ margin: 0, paddingLeft: '16px', listStyle: 'disc' }}>
                    {node.objectives.map(obj => (
                      <li key={obj.id}>{obj.title}</li>
                    ))}
                  </ul>
                </React.Fragment>
              }
              arrow
              placement="top"
            >
              <IconButton
                size="small"
                sx={{ mr: 0.5 }} // Espacement avant les autres boutons
                onClick={(e) => e.stopPropagation()} // Empêche la propagation du clic
                aria-label={`Voir les objectifs de ${node.name}`}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sessions/edit/${node.id.replace(/^session_/, '')}`);
            }}
            aria-label={`Modifier la séance ${node.name}`}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSession(node.id);
            }}
            aria-label={`Supprimer la séance ${node.name}`}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default NodeContent;
