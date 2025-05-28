import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Save as SaveIcon,
  Code as CodeIcon
} from '@mui/icons-material';

/**
 * Éditeur structuré pour les données JSON
 * Permet d'éditer visuellement des structures de données complexes
 */
const StructuredEditor = ({ 
  data, 
  onChange,
  title = 'Éditeur de contenu structuré',
  allowRawEdit = true
}) => {
  const [structuredData, setStructuredData] = useState(data);
  const [rawMode, setRawMode] = useState(false);
  const [rawJson, setRawJson] = useState('');
  const [jsonError, setJsonError] = useState(null);

  // Mise à jour des données lorsque les props changent
  useEffect(() => {
    setStructuredData(data);
    setRawJson(JSON.stringify(data, null, 2));
  }, [data]);

  // Analyse générique d'une structure de données
  const renderStructure = (structure, path = '') => {
    if (structure === null || structure === undefined) {
      return <Typography color="error">Valeur non définie</Typography>;
    }

    // Si c'est un tableau
    if (Array.isArray(structure)) {
      return renderArray(structure, path);
    }
    
    // Si c'est un objet
    if (typeof structure === 'object') {
      return renderObject(structure, path);
    }
    
    // Sinon c'est une valeur primitive
    return renderPrimitive(structure, path);
  };

  // Rendu d'un tableau
  const renderArray = (array, path) => {
    return (
      <Box sx={{ ml: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Liste ({array.length} élément{array.length > 1 ? 's' : ''})
          </Typography>
          <Tooltip title="Ajouter un élément">
            <IconButton 
              size="small" 
              color="primary"
              onClick={() => handleAddArrayItem(array, path)}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
        {array.map((item, index) => (
          <Accordion key={index} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                <Typography>
                  Élément {index + 1}
                  {typeof item === 'object' && item !== null && item.id && 
                    ` (ID: ${item.id})`
                  }
                </Typography>
                <Box>
                  <Tooltip title="Monter">
                    <IconButton 
                      size="small"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveArrayItem(path, index, 'up');
                      }}
                    >
                      <ArrowUpIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Descendre">
                    <IconButton 
                      size="small"
                      disabled={index === array.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveArrayItem(path, index, 'down');
                      }}
                    >
                      <ArrowDownIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteArrayItem(path, index);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {renderStructure(item, `${path}[${index}]`)}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    );
  };

  // Rendu d'un objet
  const renderObject = (obj, path) => {
    return (
      <Box sx={{ ml: 2 }}>
        {Object.keys(obj).map((key) => (
          <Box key={key} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {key}:
            </Typography>
            {renderStructure(obj[key], path ? `${path}.${key}` : key)}
          </Box>
        ))}
      </Box>
    );
  };

  // Rendu d'une valeur primitive
  const renderPrimitive = (value, path) => {
    return (
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        value={value}
        onChange={(e) => handleChangeValue(path, e.target.value)}
        sx={{ mb: 1 }}
      />
    );
  };

  // Ajout d'un élément à un tableau
  const handleAddArrayItem = (array, path) => {
    // Déterminer le type d'élément à ajouter
    let newItem;
    if (array.length > 0) {
      // Copier la structure du dernier élément
      const lastItem = array[array.length - 1];
      if (typeof lastItem === 'object' && lastItem !== null) {
        if (Array.isArray(lastItem)) {
          newItem = [];
        } else {
          newItem = {};
          Object.keys(lastItem).forEach(key => {
            // Copier la structure mais pas les valeurs
            if (typeof lastItem[key] === 'string') {
              newItem[key] = '';
            } else if (typeof lastItem[key] === 'number') {
              newItem[key] = 0;
            } else if (Array.isArray(lastItem[key])) {
              newItem[key] = [];
            } else if (typeof lastItem[key] === 'object') {
              newItem[key] = {};
            } else {
              newItem[key] = null;
            }
          });
        }
      } else {
        newItem = typeof lastItem === 'string' ? '' : 
                  typeof lastItem === 'number' ? 0 : null;
      }
    } else {
      // Si le tableau est vide, ajouter un objet vide par défaut
      newItem = {};
    }

    // Mise à jour de la structure
    const newData = JSON.parse(JSON.stringify(structuredData));
    let target = newData;
    
    if (path) {
      // Naviguer dans la structure pour trouver le tableau cible
      const parts = path.split('.');
      for (const part of parts) {
        if (part.includes('[') && part.includes(']')) {
          const arrName = part.substring(0, part.indexOf('['));
          const arrIndex = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
          target = target[arrName][arrIndex];
        } else {
          target = target[part];
        }
      }
    }
    
    target.push(newItem);
    
    // Mise à jour de l'état et notification du parent
    setStructuredData(newData);
    setRawJson(JSON.stringify(newData, null, 2));
    onChange(newData);
  };

  // Suppression d'un élément d'un tableau
  const handleDeleteArrayItem = (path, index) => {
    const newData = JSON.parse(JSON.stringify(structuredData));
    
    if (!path) {
      // C'est le tableau racine
      newData.splice(index, 1);
    } else {
      // Naviguer dans la structure pour trouver le tableau cible
      const parts = path.split('.');
      let target = newData;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.includes('[') && part.includes(']')) {
          const arrName = part.substring(0, part.indexOf('['));
          const arrIndex = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
          target = target[arrName][arrIndex];
        } else {
          target = target[part];
        }
      }
      
      target.splice(index, 1);
    }
    
    setStructuredData(newData);
    setRawJson(JSON.stringify(newData, null, 2));
    onChange(newData);
  };

  // Déplacement d'un élément dans un tableau
  const handleMoveArrayItem = (path, index, direction) => {
    if (direction !== 'up' && direction !== 'down') return;
    
    const newData = JSON.parse(JSON.stringify(structuredData));
    let target;
    
    if (!path) {
      // C'est le tableau racine
      target = newData;
    } else {
      // Naviguer dans la structure pour trouver le tableau cible
      const parts = path.split('.');
      target = newData;
      
      for (const part of parts) {
        if (part.includes('[') && part.includes(']')) {
          const arrName = part.substring(0, part.indexOf('['));
          const arrIndex = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
          target = target[arrName][arrIndex];
        } else {
          target = target[part];
        }
      }
    }
    
    if (direction === 'up' && index > 0) {
      const temp = target[index];
      target[index] = target[index - 1];
      target[index - 1] = temp;
    } else if (direction === 'down' && index < target.length - 1) {
      const temp = target[index];
      target[index] = target[index + 1];
      target[index + 1] = temp;
    }
    
    setStructuredData(newData);
    setRawJson(JSON.stringify(newData, null, 2));
    onChange(newData);
  };

  // Modification d'une valeur primitive
  const handleChangeValue = (path, value) => {
    const newData = JSON.parse(JSON.stringify(structuredData));
    
    if (!path) {
      // C'est la valeur racine (cas improbable)
      return;
    }
    
    // Naviguer dans la structure pour trouver la valeur cible
    const parts = path.split('.');
    let target = newData;
    let lastPart = parts[parts.length - 1];
    
    // Parcourir tous les éléments sauf le dernier
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part.includes('[') && part.includes(']')) {
        const arrName = part.substring(0, part.indexOf('['));
        const arrIndex = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
        target = target[arrName][arrIndex];
      } else {
        target = target[part];
      }
    }
    
    // Traiter le dernier élément
    if (lastPart.includes('[') && lastPart.includes(']')) {
      const arrName = lastPart.substring(0, lastPart.indexOf('['));
      const arrIndex = parseInt(lastPart.substring(lastPart.indexOf('[') + 1, lastPart.indexOf(']')));
      target[arrName][arrIndex] = value;
    } else {
      target[lastPart] = value;
    }
    
    setStructuredData(newData);
    setRawJson(JSON.stringify(newData, null, 2));
    onChange(newData);
  };

  // Changement de mode d'édition (visuel/raw)
  const toggleEditMode = () => {
    if (rawMode) {
      // Passer du mode raw au mode visuel
      try {
        const parsed = JSON.parse(rawJson);
        setStructuredData(parsed);
        setJsonError(null);
        onChange(parsed);
        setRawMode(false);
      } catch (err) {
        setJsonError("Format JSON invalide. Veuillez corriger les erreurs avant de continuer.");
      }
    } else {
      // Passer du mode visuel au mode raw
      setRawJson(JSON.stringify(structuredData, null, 2));
      setRawMode(true);
    }
  };

  // Mise à jour du JSON brut
  const handleRawJsonChange = (e) => {
    setRawJson(e.target.value);
    try {
      JSON.parse(e.target.value);
      setJsonError(null);
    } catch (err) {
      setJsonError("Format JSON invalide");
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        {allowRawEdit && (
          <Button
            startIcon={rawMode ? <EditIcon /> : <CodeIcon />}
            onClick={toggleEditMode}
            variant="outlined"
            size="small"
          >
            {rawMode ? "Mode visuel" : "Mode JSON"}
          </Button>
        )}
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {rawMode ? (
        <Box>
          <TextField
            multiline
            fullWidth
            rows={10}
            value={rawJson}
            onChange={handleRawJsonChange}
            error={!!jsonError}
            helperText={jsonError}
            sx={{ fontFamily: 'monospace' }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={toggleEditMode}
            disabled={!!jsonError}
            sx={{ mt: 2 }}
          >
            Appliquer les modifications
          </Button>
        </Box>
      ) : (
        <Box>
          {renderStructure(structuredData)}
        </Box>
      )}
    </Paper>
  );
};

export default StructuredEditor;
