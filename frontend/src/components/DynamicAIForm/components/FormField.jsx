import React, { useState } from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Typography,
  Box,
  Chip,
  Paper,
  FormHelperText,
  Autocomplete,
  Button,
  Switch,
  InputAdornment,
  IconButton,
  Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { AttachFile as AttachFileIcon, Clear as ClearIcon, Search as SearchIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Importer notre composant spécifique pour le niveau
import NiveauSelect from './NiveauSelect';
// Importer la modale de sélection de ressources
import ResourceSelectorModal from '../../resources/ResourceSelectorModal';

/**
 * Composant générique pour afficher un champ de formulaire selon son type
 * 
 * @param {Object} props - Propriétés du composant
 * @param {Object} props.field - Description du champ (type, nom, label, etc.)
 * @param {any} props.value - Valeur actuelle du champ
 * @param {Function} props.onChange - Fonction appelée lors du changement de valeur
 * @param {Object} props.error - Erreur éventuelle pour ce champ
 * @param {boolean} props.disabled - Si le champ est désactivé
 * @param {boolean} props.fullWidth - Si le champ doit prendre toute la largeur
 * @returns {JSX.Element} Élément React correspondant au type de champ
 */
const FormField = ({ 
  field, 
  value, 
  onChange, 
  error, 
  disabled = false, 
  fullWidth = true 
}) => {
  const theme = useTheme();
  const [filePreview, setFilePreview] = useState(null);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [selectedResources, setSelectedResources] = useState([]);

  // Effet pour synchroniser les ressources sélectionnées avec les IDs (pour resource_ids uniquement)
  React.useEffect(() => {
    if (field?.name === 'resource_ids') {
      if (Array.isArray(value) && value.length > 0) {
        // Si on a des IDs, on garde juste les IDs pour l'affichage
        // Les détails complets seront récupérés lors de l'ouverture de la modale
        setSelectedResources(value.map(id => ({ id, title: `Ressource #${id}` })));
      } else {
        setSelectedResources([]);
      }
    }
  }, [value, field?.name]);

  // Fonction auxiliaire pour vérifier si un champ est de type liste
  const isListField = (field) => {
    return field.type === 'array' || field.type === 'list';
  };

  if (!field) {
    console.error('Aucun champ défini pour FormField');
    return null;
  }
  
  // Traitement spécial pour les champs de niveau (tout en récupérant les options du schéma)
  if (field.name === 'niveau' || field.name === 'niveau_classe') {
    console.log(`Traitement spécial pour le champ ${field.name}`);
    
    // Récupérer les options d'énumération depuis les différentes sources possibles
    let enumOptions = [];
    if (field.enum && Array.isArray(field.enum)) {
      console.log(`Options d'énumération depuis field.enum:`, field.enum);
      enumOptions = field.enum;
    } else if (field.validations && field.validations.enum && Array.isArray(field.validations.enum)) {
      console.log(`Options d'énumération depuis field.validations.enum:`, field.validations.enum);
      enumOptions = field.validations.enum;
    }
    
    console.log(`Options finales pour ${field.name}:`, enumOptions);
    
    return (
      <NiveauSelect 
        fieldName={field.name}
        label={field.label || field.name}
        value={value || ''}
        onChange={onChange}
        error={error}
        description={field.description}
        disabled={disabled}
        fullWidth={fullWidth}
        enumOptions={enumOptions}
      />
    );
  }

  // Gérer différents types de champs
  switch (field.type) {
    case 'string':
    case 'text':
      // Vérifier d'abord si c'est un champ avec énumération
      if (field.enum || (field.validations && field.validations.enum)) {
        const enumOptions = field.enum || field.validations.enum || [];
        console.log(`Champ string avec énumération détecté - ${field.name}:`, enumOptions);
        
        return (
          <FormControl 
            fullWidth={fullWidth} 
            error={!!error} 
            disabled={disabled} 
            variant="outlined"
            margin="normal"
          >
            <InputLabel id={`${field.name}-label`}>
              {field.label || field.name}
            </InputLabel>
            <Select
              labelId={`${field.name}-label`}
              name={field.name}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              label={field.label || field.name}
            >
              {enumOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {(error || field.description) && (
              <FormHelperText>{error || field.description}</FormHelperText>
            )}
          </FormControl>
        );
      }
      // Si le champ a un format spécifique (email, password, etc.)
      if (field.format) {
        switch (field.format) {
          case 'email':
            return (
              <TextField
                label={field.label || field.name}
                name={field.name}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                error={!!error}
                helperText={error || field.description}
                fullWidth={fullWidth}
                type="email"
                disabled={disabled}
                variant="outlined"
                margin="normal"
              />
            );
          case 'password':
            return (
              <TextField
                label={field.label || field.name}
                name={field.name}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                error={!!error}
                helperText={error || field.description}
                fullWidth={fullWidth}
                type="password"
                disabled={disabled}
                variant="outlined"
                margin="normal"
              />
            );
          case 'date':
            return (
              <TextField
                label={field.label || field.name}
                name={field.name}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                error={!!error}
                helperText={error || field.description}
                fullWidth={fullWidth}
                type="date"
                InputLabelProps={{ shrink: true }}
                disabled={disabled}
                variant="outlined"
                margin="normal"
              />
            );
          default:
            // Format non reconnu, utiliser un champ texte standard
            return (
              <TextField
                label={field.label || field.name}
                name={field.name}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                error={!!error}
                helperText={error || field.description}
                fullWidth={fullWidth}
                disabled={disabled}
                variant="outlined"
                margin="normal"
              />
            );
        }
      }

      // Pour les champs texte multi-lignes
      if (field.multiline) {
        return (
          <TextField
            label={field.label || field.name}
            name={field.name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            error={!!error}
            helperText={error || field.description}
            fullWidth={fullWidth}
            multiline
            rows={field.rows || 4}
            disabled={disabled}
            variant="outlined"
            margin="normal"
          />
        );
      }

      // Champ texte standard
      return (
        <TextField
          label={field.label || field.name}
          name={field.name}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
          helperText={error || field.description}
          fullWidth={fullWidth}
          disabled={disabled}
          variant="outlined"
          margin="normal"
        />
      );

    case 'number':
    case 'integer':
      return (
        <TextField
          label={field.label || field.name}
          name={field.name}
          value={value !== undefined && value !== null ? value : ''}
          onChange={(e) => {
            const val = e.target.value;
            const numVal = field.type === 'integer' ? parseInt(val, 10) : parseFloat(val);
            onChange(val === '' ? '' : isNaN(numVal) ? value : numVal);
          }}
          error={!!error}
          helperText={error || field.description}
          fullWidth={fullWidth}
          type="number"
          disabled={disabled}
          variant="outlined"
          margin="normal"
          InputProps={{
            endAdornment: field.unit && (
              <InputAdornment position="end">{field.unit}</InputAdornment>
            ),
          }}
        />
      );

    case 'boolean':
      return (
        <FormControl 
          fullWidth={fullWidth} 
          error={!!error} 
          disabled={disabled}
          margin="normal"
        >
          <FormControlLabel
            control={
              <Switch
                checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
                name={field.name}
                color="primary"
              />
            }
            label={field.label || field.name}
          />
          {(error || field.description) && (
            <FormHelperText>{error || field.description}</FormHelperText>
          )}
        </FormControl>
      );

    case 'array':
    case 'list':
      // Traitement spécial pour resource_ids : utiliser la modale de recherche
      if (field.name === 'resource_ids') {
        const handleSaveResources = (resources) => {
          setSelectedResources(resources);
          onChange(resources.map(res => res.id));
          setResourceModalOpen(false);
        };

        const handleRemoveResource = (resourceId) => {
          const newResources = selectedResources.filter(res => res.id !== resourceId);
          setSelectedResources(newResources);
          onChange(newResources.map(res => res.id));
        };

        return (
          <Box mt={2} mb={2}>
            <Typography variant="subtitle1" gutterBottom>
              {field.label || field.name}
            </Typography>
            
            <Stack spacing={2}>
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={() => setResourceModalOpen(true)}
                disabled={disabled}
              >
                Rechercher des ressources
              </Button>

              {selectedResources.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedResources.map((resource) => (
                    <Chip
                      key={resource.id}
                      label={resource.title || `Ressource #${resource.id}`}
                      onDelete={disabled ? undefined : () => handleRemoveResource(resource.id)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}

              {!selectedResources.length && (
                <Typography variant="body2" color="text.secondary">
                  Aucune ressource sélectionnée
                </Typography>
              )}
            </Stack>

            {(error || field.description) && (
              <FormHelperText error={!!error}>
                {error || field.description}
              </FormHelperText>
            )}

            <ResourceSelectorModal
              open={resourceModalOpen}
              onClose={() => setResourceModalOpen(false)}
              initialSelectedResources={selectedResources}
              onSave={handleSaveResources}
            />
          </Box>
        );
      }

      // Si les éléments sont des objets complexes
      if (field.items && field.items.type === 'object') {
        // Logique pour les listes d'objets complexes - à implémenter
        return (
          <Box mt={2} mb={2}>
            <Typography variant="subtitle1">{field.label || field.name}</Typography>
            <Typography variant="body2" color="textSecondary">
              {field.description || 'Liste d\'objets complexes'}
            </Typography>
          </Box>
        );
      }

      // Pour les listes de valeurs simples
      if (field.enum) {
        return (
          <FormControl 
            fullWidth={fullWidth} 
            error={!!error} 
            disabled={disabled} 
            variant="outlined"
            margin="normal"
          >
            <InputLabel id={`${field.name}-label`}>
              {field.label || field.name}
            </InputLabel>
            <Select
              labelId={`${field.name}-label`}
              name={field.name}
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => onChange(e.target.value)}
              label={field.label || field.name}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {field.enum.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {(error || field.description) && (
              <FormHelperText>{error || field.description}</FormHelperText>
            )}
          </FormControl>
        );
      }

      // Pour les listes de saisie libre
      return (
        <Autocomplete
          multiple
          options={[]}
          freeSolo
          value={Array.isArray(value) ? value : []}
          onChange={(event, newValue) => onChange(newValue)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant="outlined"
                label={option}
                {...getTagProps({ index })}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label={field.label || field.name}
              helperText={error || field.description}
              error={!!error}
              fullWidth={fullWidth}
              margin="normal"
            />
          )}
          disabled={disabled}
        />
      );

    case 'enum':
    case 'select':
      {
        // Débogage complet du champ
        console.log(`======= Détails du champ ${field.name || 'sans nom'} =======`);
        console.log(`Type: ${field.type}`);
        console.log(`Label: ${field.label || field.name}`);
        console.log(`Description: ${field.description || 'Aucune'}`);
        console.log(`Propriété enum directe:`, field.enum);
        console.log(`Propriété validations:`, field.validations);
        if (field.validations) {
          console.log(`Propriété validations.enum:`, field.validations.enum);
        }
      
        // Récupération des options d'énumération avec fallback dur codé pour niveau scolaire
        let enumOptions = [];
        
        // 1. Essayer d'abord field.enum directement
        if (field.enum && Array.isArray(field.enum)) {
          enumOptions = field.enum;
          console.log(`Options depuis field.enum:`, enumOptions);
        } 
        // 2. Essayer ensuite field.validations.enum
        else if (field.validations && field.validations.enum && Array.isArray(field.validations.enum)) {
          enumOptions = field.validations.enum;
          console.log(`Options depuis field.validations.enum:`, enumOptions);
        } else {
          console.log(`Aucune option d'énumération trouvée pour ${field.name}`);
        }
      
        // Afficher les options finales
        console.log(`Rendu final du champ ${field.name} avec ${enumOptions.length} options:`, enumOptions);
      
        return (
          <FormControl 
            fullWidth={fullWidth} 
            error={!!error} 
            disabled={disabled} 
            variant="outlined"
            margin="normal"
          >
            <InputLabel id={`${field.name}-label`}>
              {field.label || field.name}
            </InputLabel>
            <Select
              labelId={`${field.name}-label`}
              name={field.name}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              label={field.label || field.name}
            >
              {enumOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {(error || field.description) && (
              <FormHelperText>{error || field.description}</FormHelperText>
            )}
          </FormControl>
        );
      }

    case 'file':
      return (
        <Box mt={2} mb={2}>
          <Typography variant="subtitle1" gutterBottom>
            {field.label || field.name}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<AttachFileIcon />}
              disabled={disabled}
            >
              Sélectionner un fichier
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setFilePreview(e.target.result);
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setFilePreview(null);
                    }
                    onChange(file);
                  }
                }}
              />
            </Button>
            
            {value && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2">
                  {typeof value === 'string' ? value : value.name}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => {
                    onChange(null);
                    setFilePreview(null);
                  }}
                  disabled={disabled}
                >
                  <ClearIcon />
                </IconButton>
              </Box>
            )}
          </Box>
          
          {filePreview && (
            <Box mt={1} sx={{ maxWidth: '300px' }}>
              <img 
                src={filePreview} 
                alt="Aperçu" 
                style={{ width: '100%', borderRadius: '4px' }} 
              />
            </Box>
          )}
          
          {(error || field.description) && (
            <FormHelperText error={!!error}>
              {error || field.description}
            </FormHelperText>
          )}
        </Box>
      );

    case 'object':
      // Pour les objets complexes
      return (
        <Paper 
          elevation={1} 
          sx={{ padding: 2, marginTop: 2, marginBottom: 2 }}
        >
          <Typography variant="subtitle1" gutterBottom>
            {field.label || field.name}
          </Typography>
          
          {field.properties && Object.entries(field.properties).map(([propName, propConfig]) => (
            <FormField
              key={propName}
              field={{ ...propConfig, name: propName }}
              value={value ? value[propName] : undefined}
              onChange={(newValue) => {
                const updatedObj = { ...(value || {}) };
                updatedObj[propName] = newValue;
                onChange(updatedObj);
              }}
              error={error ? error[propName] : undefined}
              disabled={disabled}
            />
          ))}
          
          {field.description && (
            <FormHelperText>{field.description}</FormHelperText>
          )}
        </Paper>
      );

    default:
      console.warn(`Type de champ non pris en charge: ${field.type}`);
      return (
        <Box mt={2} mb={2}>
          <Typography color="error">
            Type de champ non pris en charge: {field.type}
          </Typography>
        </Box>
      );
  }
};

export default FormField;
