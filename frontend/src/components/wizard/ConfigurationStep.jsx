import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  FormHelperText,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
  Grid,
  Divider,
  FormLabel,
  FormGroup,
  FormControlLabel
} from '@mui/material';
import api from '../../services/api';

const ConfigurationStep = ({
  sessionId,
  onContinue,
  onClose,
  initialConfig = { niveau_classe: '', nombre_ressources: '', type_resources: [], support_id: null, selectionMode: 'auto' }
}) => {
  const [config, setConfig] = useState(initialConfig);
  const [classLevels, setClassLevels] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [availableResourceTypes, setAvailableResourceTypes] = useState([]);
  const [loadingResourceTypes, setLoadingResourceTypes] = useState(false);
  const [availableSupports, setAvailableSupports] = useState([]);
  const [loadingSupports, setLoadingSupports] = useState(false);
  // Maps pour retrouver les libellés des types/sous-types à partir de leurs IDs
  const [typeNameById, setTypeNameById] = useState({});
  const [subtypeNameById, setSubtypeNameById] = useState({});
  const [typeKeyById, setTypeKeyById] = useState({});
  const [subtypeKeyById, setSubtypeKeyById] = useState({});

  // Charger les types de ressources disponibles
  useEffect(() => {
    const fetchAvailableResourceTypes = async () => {
      setLoadingResourceTypes(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Authentification requise");

        // Récupérer les types de ressources disponibles
        const response = await api.get('/ai/resource-types', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data && Array.isArray(response.data.types)) { 
          const flattenedResourceTypes = [];
          const typeMap = {};
          const subtypeMap = {};
          const typeKeyMap = {};
          const subtypeKeyMap = {};
          response.data.types.forEach(typeObject => { 
            // Enregistrer le nom du type quel que soit l'existence de sous-types
            if (typeof typeObject.id !== 'undefined' && typeof typeObject.value !== 'undefined') {
              typeMap[typeObject.id] = typeObject.value;
            }
            if (typeof typeObject.id !== 'undefined' && typeof typeObject.key !== 'undefined') {
              typeKeyMap[typeObject.id] = typeObject.key;
            }
            if (typeObject.subtypes && typeObject.subtypes.length > 0) {
              typeObject.subtypes.forEach(subtypeObject => { 
                // Enregistrer le nom du sous-type
                if (typeof subtypeObject.id !== 'undefined' && typeof subtypeObject.value !== 'undefined') {
                  subtypeMap[subtypeObject.id] = subtypeObject.value;
                }
                if (typeof subtypeObject.id !== 'undefined' && typeof subtypeObject.key !== 'undefined') {
                  subtypeKeyMap[subtypeObject.id] = subtypeObject.key;
                }
                flattenedResourceTypes.push({
                  type_id: typeObject.id,
                  type_key: typeObject.key,
                  type_name: typeObject.value, 
                  subtype_id: subtypeObject.id,
                  subtype_key: subtypeObject.key,
                  subtype_name: subtypeObject.value, 
                  // description: subtypeObject.description || typeObject.description || '' 
                });
              });
            } else {
              // Optionnel: Gérer les types qui n'ont pas de sous-types mais que vous voudriez quand même lister.
              // Pour la sélection manuelle actuelle, on se concentre sur les paires type/sous-type.
            }
          });
          
          console.log('Types de ressources disponibles (transformés):', flattenedResourceTypes);
          setAvailableResourceTypes(flattenedResourceTypes);
          setTypeNameById(typeMap);
          setSubtypeNameById(subtypeMap);
          setTypeKeyById(typeKeyMap);
          setSubtypeKeyById(subtypeKeyMap);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des types de ressources:", err);
        setError("Impossible de charger les types de ressources disponibles.");
      } finally {
        setLoadingResourceTypes(false);
      }
    };

    fetchAvailableResourceTypes();
  }, []);

  // Charger les supports disponibles pour cette session
  useEffect(() => {
    const fetchAvailableSupports = async () => {
      if (!sessionId) return;
      
      setLoadingSupports(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Authentification requise");

        // Récupérer les œuvres disponibles pour cette session
        const response = await api.get(`/ai/sessions/${sessionId}/available-supports`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Supports disponibles:', response.data);
        setAvailableSupports(response.data || []);
      } catch (err) {
        console.error("Erreur lors du chargement des supports:", err);
        setError("Impossible de charger les supports disponibles.");
      } finally {
        setLoadingSupports(false);
      }
    };

    fetchAvailableSupports();
  }, [sessionId]);
  
  // Charger les niveaux de classe depuis le backend
  useEffect(() => {
    const fetchClassLevels = async () => {
      setLoadingSchema(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Authentification requise");

        // Utiliser l'API existante pour récupérer le schéma du prompt
        // Pour le suggest_exercise_types_for_session, nous devons utiliser meta/exercise_suggester
        const response = await api.get('/ai/resource-types/meta/exercise_suggester/schema', {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Réponse complète du schéma:', response.data);

        if (response.data && response.data.fields) {
          // Rechercher le champ niveau_classe dans les champs retournés
          const niveauField = response.data.fields.find(field => field.name === 'niveau_classe');
          
          if (niveauField && niveauField.enum) {
            console.log('Niveaux de classe récupérés:', niveauField.enum);
            setClassLevels(niveauField.enum);
          } else if (niveauField && niveauField.validations && niveauField.validations.enum) {
            // Alternative - chercher dans validations.enum
            console.log('Niveaux de classe récupérés depuis validations:', niveauField.validations.enum);
            setClassLevels(niveauField.validations.enum);
          } 
        } 
      } catch (err) {
        console.error("Erreur lors du chargement des niveaux de classe:", err);
      } finally {
        setLoadingSchema(false);
      }
    };

    fetchClassLevels();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Gestionnaire spécifique pour la sélection multiple des types de ressources
  const handleResourceTypesChange = (event) => {
    // event.target.value peut être une string (cas Autofill) ou un tableau
    const rawValue = event.target.value;
    const selectedIndices = typeof rawValue === 'string'
      ? rawValue.split(',').map((v) => Number(v))
      : rawValue.map((v) => Number(v));
    
    console.log("%cIndices sélectionnés:", "color: #3f51b5; font-weight: bold;", selectedIndices);
    
    // Transformer directement les indices en objets type_key/subtype_key
    const selectedResourceTypes = selectedIndices.map(index => {
      if (index >= 0 && index < availableResourceTypes.length) {
        const resourceType = availableResourceTypes[index];
        return {
          type_key: resourceType.type_key,
          subtype_key: resourceType.subtype_key,
          index: index // Conserver l'indice pour faciliter le rendu
        };
      }
      return null;
    }).filter(item => item !== null);
    
    console.log("%cTypes d'exercices transformés:", "color: #4caf50; font-weight: bold;", selectedResourceTypes);
    
    setConfig(prev => ({
      ...prev,
      type_resources: selectedResourceTypes
    }));
  };
  
  // Obtenir les indices des types de ressources sélectionnés
  const getSelectedResourceTypeIndices = () => {
    if (!config.type_resources || !config.type_resources.length || !availableResourceTypes.length) {
      return [];
    }
    
    // Attention: 0 est un index valide, ne pas utiliser '||'
    const indices = config.type_resources
      .map(item => (typeof item.index === 'number' ? item.index : -1))
      .filter(index => index !== -1);
    console.log("%cgetSelectedResourceTypeIndices retourne:", "color: #8bc34a;", indices);
    return indices;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Créer une copie du config
    const configToSubmit = { ...config };

    // Validation: empêcher "analyse_texte" sans support en mode manuel
    const hasAnalyseTexte = Array.isArray(config.type_resources) && config.type_resources.some(item => item?.type_key === 'exercice' && item?.subtype_key === 'analyse_texte');
    if (config.selectionMode === 'manual' && hasAnalyseTexte && !config.support_id) {
      setError("L'exercice 'Analyse de texte' requiert un support pédagogique (œuvre). Veuillez sélectionner un support avant de continuer.");
      return;
    }
    
    // Débogage des type_resources sélectionnés
    console.log("%ctype_resources avant envoi:", "background: #3f51b5; color: white; padding: 2px 5px;", {
      valeur: config.type_resources,
      type: typeof config.type_resources,
      estTableau: Array.isArray(config.type_resources),
      longueur: config.type_resources ? config.type_resources.length : 0
    });
    
    // Déterminer automatiquement le mode de sélection si l'utilisateur a sélectionné des types
    if (config.type_resources && config.type_resources.length > 0) {
      configToSubmit.selectionMode = 'manual';
      console.log("%cSélection en mode manuel car des types sont sélectionnés", "color: #3f51b5;");
      
      // Nettoyer les objets pour n'envoyer que type_key et subtype_key
      // En supprimant les propriétés supplémentaires comme 'index'
      const cleanedTypes = config.type_resources.map(item => ({
        type_key: item.type_key,
        subtype_key: item.subtype_key
      }));
      
      // Mettre à jour le configToSubmit avec les types nettoyés
      configToSubmit.type_resources = cleanedTypes;
      configToSubmit.nombre_ressources = ''; // Désactiver le nombre en mode manuel
      
      console.log('%cTypes d\'exercices nettoyés pour l\'API:', 'background: #4caf50; color: white; padding: 2px 5px;', cleanedTypes);
    } else {
      // Mode auto ou aucune sélection
      configToSubmit.type_resources = [];
      console.log('%cAucun type sélectionné, tableau vide envoyé', 'color: #f44336;');
    }
    
    // Log pour débogage
    console.log('%cConfiguration finale envoyée:', 'background: #9c27b0; color: white; padding: 2px 5px;', configToSubmit);
    
    onContinue(configToSubmit);
  };

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Configuration de la génération</Typography>
      
      <Card sx={{ mb: 3, p: 1 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Veuillez configurer les paramètres pour la génération des ressources IA. Ces informations aideront l'IA à proposer des exercices adaptés au niveau de votre classe.
          </Typography>

          <form onSubmit={handleSubmit}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="niveau-classe-label">Niveau de classe</InputLabel>
              <Select
                labelId="niveau-classe-label"
                name="niveau_classe"
                value={config.niveau_classe}
                onChange={handleChange}
                label="Niveau de classe"
                disabled={loadingSchema}
              >
                {loadingSchema ? (
                  <MenuItem value="">
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Chargement...
                  </MenuItem>
                ) : (
                  classLevels.map(level => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <FormLabel component="legend">Mode de génération des ressources</FormLabel>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.selectionMode === 'auto'}
                      onChange={() => {
                        setConfig({
                          ...config,
                          selectionMode: 'auto',
                          type_resources: []
                        });
                      }}
                      name="selectionMode"
                      value="auto"
                      disabled={loading}
                    />
                  }
                  label="Génération automatique avec nombre défini"
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.selectionMode === 'manual'}
                      onChange={() => {
                        setConfig({
                          ...config,
                          selectionMode: 'manual',
                          nombre_ressources: ''
                        });
                      }}
                      name="selectionMode"
                      value="manual"
                      disabled={loading}
                    />
                  }
                  label="Sélection manuelle des types d'exercices"
                />
              </FormGroup>
              <FormHelperText>
                Choisissez un mode de génération. Soit un nombre de ressources automatiquement choisies par l'IA, soit une sélection précise des types d'exercices.
              </FormHelperText>
            </FormControl>
            
            {config.selectionMode === 'auto' && (
              <TextField
                fullWidth
                type="number"
                name="nombre_ressources"
                label="Nombre de ressources souhaitées"
                value={config.nombre_ressources}
                onChange={handleChange}
                margin="normal"
                helperText="Si non spécifié, l'IA choisira automatiquement le nombre optimal."
                disabled={loading}
                inputProps={{ min: 1, max: 10 }}
                sx={{ mb: 3 }}
              />
            )}
            
            {config.selectionMode === 'manual' && (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="resource-types-label">Types d'exercices spécifiques</InputLabel>
                <Select
                  labelId="resource-types-label"
                  multiple
                  value={getSelectedResourceTypeIndices()}
                  onChange={handleResourceTypesChange}
                  input={<OutlinedInput label="Types d'exercices spécifiques" />}
                  renderValue={(selected) => {
                    console.log("%cRenderValue sélection:", "background: #00bcd4; color: white;", selected);
                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((index) => {
                          // Vérification supplémentaire pour s'assurer que l'index est valide
                          if (index >= 0 && index < availableResourceTypes.length) {
                            return (
                              <Chip 
                                key={index} 
                                label={`${availableResourceTypes[index].type_name}: ${availableResourceTypes[index].subtype_name}`}
                              />
                            );
                          }
                          return null;
                        }).filter(Boolean)}
                      </Box>
                    );
                  }}
                  disabled={loadingResourceTypes || !availableResourceTypes.length}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300
                      },
                    },
                  }}
                >
                  {loadingResourceTypes ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Chargement des types de ressources...
                    </MenuItem>
                  ) : (
                    availableResourceTypes.map((resource, index) => {
                      const requiresSupport = (resource?.type_key === 'exercice' && resource?.subtype_key === 'analyse_texte');
                      const isDisabled = requiresSupport && !config.support_id;
                      return (
                        <MenuItem key={index} value={index} disabled={isDisabled}>
                          <Checkbox checked={getSelectedResourceTypeIndices().indexOf(index) > -1} disabled={isDisabled} />
                          <ListItemText 
                            primary={`${resource.type_name}: ${resource.subtype_name}`} 
                            secondary={isDisabled ? "Requiert un support pédagogique" : resource.description} 
                          />
                        </MenuItem>
                      );
                    })
                  )}
                </Select>
                <FormHelperText>
                  Sélectionnez les types d'exercices que vous souhaitez explicitement inclure dans les suggestions.
                  {!config.support_id ? " Note: 'Analyse de texte' requiert la sélection d'un support (œuvre)." : ''}
                </FormHelperText>
              </FormControl>
            )}
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="support-label">Support pédagogique (Œuvre)</InputLabel>
              <Select
                labelId="support-label"
                name="support_id"
                value={config.support_id || ''}
                onChange={handleChange}
                label="Support pédagogique (Œuvre)"
                disabled={loadingSupports || !availableSupports.length}
              >
                <MenuItem value="">
                  <em>Aucun support spécifique</em>
                </MenuItem>
                {loadingSupports ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Chargement des supports disponibles...
                  </MenuItem>
                ) : (
                  availableSupports.map((support) => {
                    const oeuvreTitle = (support?.oeuvres && support.oeuvres.length > 0)
                      ? (support.oeuvres[0]?.titre || '')
                      : '';
                    const resourceTitle = support?.title || '';
                    // Fallbacks: utiliser aussi les valeurs imbriquées si présentes côté backend
                    const typeName = (
                      (support?.type && support.type?.value) ||
                      (typeof support?.type_id !== 'undefined' ? (typeNameById?.[support.type_id] || '') : '')
                    );
                    const subtypeName = (
                      (support?.sub_type && support.sub_type?.value) ||
                      ((typeof support?.sub_type_id !== 'undefined' && support?.sub_type_id !== null)
                        ? (subtypeNameById?.[support.sub_type_id] || '')
                        : '')
                    );
                    // Niveaux supplémentaires de fallback: utiliser keys ou ID si noms absents
                    const typeFallback = typeName || (
                      (typeof support?.type_id !== 'undefined' && typeKeyById?.[support.type_id]) ||
                      (typeof support?.type_id !== 'undefined' ? `type#${support.type_id}` : '')
                    );
                    const subtypeFallback = subtypeName || (
                      (typeof support?.sub_type_id !== 'undefined' && support?.sub_type_id !== null && subtypeKeyById?.[support.sub_type_id]) ||
                      (typeof support?.sub_type_id !== 'undefined' && support?.sub_type_id !== null ? `subtype#${support.sub_type_id}` : '')
                    );
                    const labelParts = [oeuvreTitle, resourceTitle, typeFallback, subtypeFallback].filter(Boolean);
                    const label = labelParts.join(' - ');
                    console.log('[Support label]', { support, oeuvreTitle, resourceTitle, typeName, subtypeName, label });
                    return (
                      <MenuItem key={support.id} value={support.id}>
                        {label || resourceTitle || `Support ${support.id}`}
                      </MenuItem>
                    );
                  })
                )}
              </Select>
              <FormHelperText>
                Sélectionnez une œuvre comme support pédagogique pour que les exercices générés y fassent référence. Cet élément est requis pour l'exercice "Analyse de texte".
              </FormHelperText>
            </FormControl>
            
            <Divider sx={{ my: 2 }} />

            {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button onClick={onClose} sx={{ mr: 1 }}>
                Annuler
              </Button>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : "Continuer"}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

ConfigurationStep.propTypes = {
  sessionId: PropTypes.string.isRequired,
  onContinue: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  initialConfig: PropTypes.object
};

export default ConfigurationStep;
