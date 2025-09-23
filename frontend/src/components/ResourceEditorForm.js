import React from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Paper,
  Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { useFormState } from '../hooks/useFormState';
import { useArrayOperations } from '../hooks/useArrayOperations';
import SimpleOptionRenderer from './SimpleOptionRenderer';
import SimpleOption from './SimpleOption';

/**
 * ResourceEditorForm génère dynamiquement un formulaire
 * à partir d'un objet JSON initial, permettant à l'utilisateur
 * de modifier chaque propriété avant la fusion HTML.
 * Gère également les objets et tableaux imbriqués.
 *
 * Refactored to use custom hooks and smaller components
 */
const ResourceEditorForm = ({ initialData, onSubmit, onCancel, onChange, hideButtons = false }) => {
  // Use custom hooks for state management
  const { formData, handleChange, handleNestedChange } = useFormState(initialData, onChange);
  const { handleAddItem, handleRemoveItem } = useArrayOperations(formData, () => {}, onChange);

  // Handle option text change with proper parent context
  const handleOptionTextChange = (option, optionIdx, parentPath = '') => (e) => {
    const newFormData = {...formData};

    if (!parentPath) {
      // Options directly in root
      if (!newFormData.options) newFormData.options = [];
      if (!newFormData.options[optionIdx]) newFormData.options[optionIdx] = {};

      if ('texte' in option) {
        newFormData.options[optionIdx].texte = e.target.value;
      } else {
        newFormData.options[optionIdx].text = e.target.value;
      }
    } else {
      // Options in nested object
      try {
        let obj = newFormData;
        const path = parentPath.split('.');

        for (const part of path) {
          if (part.includes('[')) {
            const name = part.substring(0, part.indexOf('['));
            const index = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));

            if (!obj[name]) obj[name] = [];
            if (!obj[name][index]) obj[name][index] = {};
            obj = obj[name][index];
          } else {
            if (!obj[part]) obj[part] = {};
            obj = obj[part];
          }
        }

        if (!obj.options) obj.options = [];
        if (!obj.options[optionIdx]) obj.options[optionIdx] = {};

        if ('texte' in option) {
          obj.options[optionIdx].texte = e.target.value;
        } else {
          obj.options[optionIdx].text = e.target.value;
        }
      } catch (error) {
        console.error("Erreur lors de la modification de l'option:", error);
      }
    }

    if (onChange) onChange(newFormData);
  };

  // Handle option isCorrect change
  const handleOptionIsCorrectChange = (optionIdx, parentPath = '') => (e) => {
    const newFormData = {...formData};

    if (!parentPath) {
      if (!newFormData.options) newFormData.options = [];
      if (!newFormData.options[optionIdx]) newFormData.options[optionIdx] = {};
      newFormData.options[optionIdx].isCorrect = e.target.checked;
    } else {
      try {
        let obj = newFormData;
        const path = parentPath.split('.');

        for (const part of path) {
          if (part.includes('[')) {
            const name = part.substring(0, part.indexOf('['));
            const index = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));

            if (!obj[name]) obj[name] = [];
            if (!obj[name][index]) obj[name][index] = {};
            obj = obj[name][index];
          } else {
            if (!obj[part]) obj[part] = {};
            obj = obj[part];
          }
        }

        if (!obj.options) obj.options = [];
        if (!obj.options[optionIdx]) obj.options[optionIdx] = {};
        obj.options[optionIdx].isCorrect = e.target.checked;
      } catch (error) {
        console.error("Erreur lors de la modification de l'option:", error);
      }
    }

    if (onChange) onChange(newFormData);
  };

  // Render a simple option
  const renderSimpleOption = (option, optionIdx, parentPath = '') => {
    if (!option || typeof option !== 'object') {
      console.error("Option invalide:", option);
      return null;
    }

    return (
      <SimpleOptionRenderer
        key={`option-${optionIdx}`}
        option={option}
        optionIdx={optionIdx}
        parentPath={parentPath}
        onOptionTextChange={handleOptionTextChange(option, optionIdx, parentPath)}
        onOptionIsCorrectChange={handleOptionIsCorrectChange(optionIdx, parentPath)}
        onRemoveOption={() => {
          const newFormData = {...formData};

          if (!parentPath) {
            if (!newFormData.options || !Array.isArray(newFormData.options)) return;
            newFormData.options = newFormData.options.filter((_, idx) => idx !== optionIdx);
          } else {
            try {
              let obj = newFormData;
              const path = parentPath.split('.');

              for (const part of path) {
                if (part.includes('[')) {
                  const name = part.substring(0, part.indexOf('['));
                  const index = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));

                  if (!obj[name]) return;
                  if (!obj[name][index]) return;
                  obj = obj[name][index];
                } else {
                  if (!obj[part]) return;
                  obj = obj[part];
                }
              }

              if (!obj.options || !Array.isArray(obj.options)) return;
              obj.options = obj.options.filter((_, idx) => idx !== optionIdx);
            } catch (error) {
              console.error("Erreur lors de la suppression de l'option:", error);
            }
          }

          if (onChange) onChange(newFormData);
        }}
      />
    );
  };

  // Recursive rendering for nested objects
  const renderNestedObject = (obj, parentKey, index = null) => {
    if (!obj || typeof obj !== 'object') return null;

    return (
      <Box sx={{ pl: 2, pt: 1, pb: 1 }}>
        {Object.keys(obj).map((key) => {
          const value = obj[key];
          const fullKey = index !== null ? `${parentKey}[${index}].${key}` : `${parentKey}.${key}`;

          // Handle QCM options specially
          if (key === 'options' && Array.isArray(value)) {
            return (
              <Box key={fullKey} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  Options ({value.length} éléments)
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      {
                        e.stopPropagation();
                        const newOption = {
                          id: String(Date.now()),
                          texte: '',
                          isCorrect: false
                        };

                        let newFormData = {...formData};
                        const optionsPath = index !== null ? `${parentKey}[${index}]` : '';

                        try {
                          let parent = newFormData;
                          if (optionsPath) {
                            const parts = optionsPath.split('.');
                            for (const part of parts) {
                              if (part.includes('[')) {
                                const arrName = part.substring(0, part.indexOf('['));
                                const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));

                                if (!parent[arrName]) parent[arrName] = [];
                                if (!parent[arrName][arrIdx]) parent[arrName][arrIdx] = {};
                                parent = parent[arrName][arrIdx];
                              } else {
                                if (!parent[part]) parent[part] = {};
                                parent = parent[part];
                              }
                            }
                          }

                          if (!parent.options) parent.options = [];
                          parent.options.push(newOption);
                          console.log("Nouvelle option ajoutée:", parent.options);

                          if (onChange) onChange(newFormData);
                        } catch (error) {
                          console.error("Erreur lors de l'ajout d'option:", error);
                        }
                      }
                    }}
                    sx={{ ml: 1 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Typography>

                {value.map((item, idx) => {
                  if (!item || typeof item !== 'object') {
                    console.error(`Option invalide à l'index ${idx}:`, item);
                    return null;
                  }
                  return renderSimpleOption(item, idx, index !== null ? `${parentKey}[${index}]` : '');
                })}
              </Box>
            );
          }

          // Handle arrays
          else if (Array.isArray(value)) {
            return (
              <Box key={fullKey} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  {key} ({value.length} éléments)
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nestedKey = index !== null ? `${parentKey}[${index}].${key}` : key;
                      handleAddItem(nestedKey);
                    }}
                    sx={{ ml: 1 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Typography>

                {value.map((item, idx) => (
                  <Accordion key={`${fullKey}[${idx}]`} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        Élément {idx + 1}
                        {typeof item === 'object' && item !== null && (item.texte || item.text)
                          ? ` - ${(item.texte || item.text).substring(0, 30)}...`
                          : ''}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nestedKey = index !== null ? `${parentKey}[${index}].${key}` : key;
                          handleRemoveItem(nestedKey, idx);
                        }}
                        sx={{ ml: 'auto' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </AccordionSummary>
                    <AccordionDetails>
                      {typeof item === 'object' && item !== null
                        ? renderNestedObject(item, `${parentKey}[${index}].${key}`, idx)
                        : (
                          <TextField
                            label={`${key}[${idx}]`}
                            value={item || ''}
                            onChange={(e) => handleNestedChange(`${parentKey}[${index}].${key}`, null, e.target.value, idx)}
                            fullWidth
                            multiline={typeof item === 'string' && item.length > 100}
                            sx={{ mb: 1 }}
                          />
                        )
                      }
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            );
          }

          // Handle nested objects
          if (typeof value === 'object' && value !== null) {
            return (
              <Accordion key={fullKey} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>{key}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {renderNestedObject(value, key)}
                </AccordionDetails>
              </Accordion>
            );
          }

          // Handle simple fields
          return (
            <TextField
              key={fullKey}
              label={key}
              value={value !== null && value !== undefined ? value : ''}
              onChange={(e) => {
                if (index !== null) {
                  handleNestedChange(parentKey, key, e.target.value, index);
                } else {
                  handleNestedChange(parentKey, key, e.target.value);
                }
              }}
              fullWidth
              multiline={typeof value === 'string' && value.length > 100}
              sx={{ mb: 2 }}
            />
          );
        })}
      </Box>
    );
  };

  // Main render
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Modifier les propriétés de la ressource
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Show message if no properties are available */}
      {Object.keys(formData).length === 0 && (
        <Typography color="text.secondary" sx={{ my: 2 }}>
          Aucune propriété à éditer. Les données générées sont vides ou mal formatées.
        </Typography>
      )}

      {Object.keys(formData).map((key) => {
        const value = formData[key];

        // Handle arrays
        if (Array.isArray(value)) {
          return (
            <Box key={key} sx={{ mb: 3 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', mb: 1 }}>
                  {key} ({value.length} éléments)
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleAddItem(key)}
                    sx={{ ml: 1 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Typography>

                {value.map((item, idx) => (
                  <Accordion key={`${key}[${idx}]`} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        Élément {idx + 1}
                        {typeof item === 'object' && item !== null && 'text' in item ? ` - ${item.text.substring(0, 30)}...` : ''}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(key, idx);
                        }}
                        sx={{ ml: 'auto' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </AccordionSummary>
                    <AccordionDetails>
                      {typeof item === 'object' && item !== null
                        ? renderNestedObject(item, key, idx)
                        : (
                          <TextField
                            label={`${key}[${idx}]`}
                            value={item || ''}
                            onChange={(e) => handleNestedChange(key, null, e.target.value, idx)}
                            fullWidth
                            multiline={typeof item === 'string' && item.length > 100}
                            sx={{ mb: 1 }}
                          />
                        )
                      }
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Paper>
            </Box>
          );
        }

        // Handle objects
        if (typeof value === 'object' && value !== null) {
          return (
            <Box key={key} sx={{ mb: 3 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {key}
                </Typography>
                {renderNestedObject(value, key)}
              </Paper>
            </Box>
          );
        }

        // Handle simple fields
        return (
          <TextField
            key={key}
            label={key}
            value={value !== null && value !== undefined ? value : ''}
            onChange={handleChange(key)}
            fullWidth
            multiline={typeof value === 'string' && value.length > 100}
            sx={{ mb: 2 }}
          />
        );
      })}

      {!hideButtons && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button onClick={onCancel} sx={{ mr: 1 }}>
            Annuler
          </Button>
          <Button variant="contained" onClick={() => onSubmit(formData)}>
            Valider
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ResourceEditorForm;
