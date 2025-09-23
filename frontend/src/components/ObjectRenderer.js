import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  IconButton,
  Box
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * Component for rendering nested objects with expand/collapse functionality
 */
const ObjectRenderer = ({
  obj,
  parentKey,
  index = null,
  formData,
  onNestedChange,
  onAddItem,
  onRemoveItem,
  onAddOption,
  onOptionsChange,
  onRemoveOption,
  renderSimpleOption,
  renderNestedObject
}) => {
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

                      // This would typically trigger a parent component update
                      // For now, we'll just log it
                    } catch (error) {
                      console.error("Erreur lors de l'ajout d'option:", error);
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
                    onAddItem(nestedKey);
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
                        onRemoveItem(nestedKey, idx);
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
                          onChange={(e) => onNestedChange(`${parentKey}[${index}].${key}`, null, e.target.value, idx)}
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
                onNestedChange(parentKey, key, e.target.value, index);
              } else {
                onNestedChange(parentKey, key, e.target.value);
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

export default ObjectRenderer;