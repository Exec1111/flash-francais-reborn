import React, { useEffect, useState } from 'react';
import {
  Box,
  Checkbox,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  CircularProgress,
  Button
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import sessionService from '../../services/sessionService';

/**
 * Étape 1 : sélection des ressources + ordre + texte introductif
 */
const FicheResourceSelector = ({ sessionId, value, onChange, onNext }) => {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState([]);

  // valeur locale = tableau d'objets { id, checked, intro }
  const [selected, setSelected] = useState(value || []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const session = await sessionService.getSessionById(sessionId);
        setResources(session.resources || []);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [sessionId]);

  const handleToggle = (resId) => {
    setSelected((prev) => {
      const existing = prev.find((p) => p.id === resId);
      if (existing) {
        // toggle
        const newArr = prev.map((p) => (p.id === resId ? { ...p, checked: !p.checked } : p));
        onChange(newArr);
        return newArr;
      }
      const newArr = [...prev, { id: resId, checked: true, intro: '' }];
      onChange(newArr);
      return newArr;
    });
  };

  const handleIntroChange = (resId, text) => {
    setSelected((prev) => {
      const newArr = prev.map((p) => (p.id === resId ? { ...p, intro: text } : p));
      onChange(newArr);
      return newArr;
    });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const srcIdx = result.source.index;
    const destIdx = result.destination.index;
    const newResources = Array.from(resources);
    const [moved] = newResources.splice(srcIdx, 1);
    newResources.splice(destIdx, 0, moved);
    setResources(newResources);
  };

  const previewResource = (id) => {
    window.open(`/resources/view/${id}`, '_blank');
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Sélectionnez les ressources à inclure
      </Typography>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="ressources">
          {(provided) => (
            <List ref={provided.innerRef} {...provided.droppableProps}>
              {resources.map((r, index) => {
                const sel = selected.find((s) => s.id === r.id) || { checked: false, intro: '' };
                return (
                  <Draggable key={r.id} draggableId={String(r.id)} index={index}>
                    {(prov) => (
                      <ListItem ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                        <Checkbox checked={sel.checked} onChange={() => handleToggle(r.id)} />
                        <ListItemText
                          primary={r.title || `Ressource ${r.id}`}
                          secondary={r.resource_type?.name}
                        />
                        <ListItemSecondaryAction>
                          <IconButton onClick={() => previewResource(r.id)}>
                            <OpenInNewIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </DragDropContext>
      <Box mt={2}>
        {selected
          .filter((s) => s && s.checked)
          .map((s) => (
            <Paper key={s.id} sx={{ p: 1, mb: 1 }}>
              <Typography variant="subtitle2">Texte avant « {resources.find((r) => r.id === s.id)?.title} »</Typography>
              <TextField
                fullWidth
                multiline
                minRows={2}
                value={s.intro}
                onChange={(e) => handleIntroChange(s.id, e.target.value)}
              />
            </Paper>
          ))}
      </Box>
      <Button variant="contained" sx={{ mt: 2 }} onClick={onNext} disabled={selected.filter((s) => s.checked).length === 0}>
        Étape suivante
      </Button>
    </Box>
  );
};

export default FicheResourceSelector;
