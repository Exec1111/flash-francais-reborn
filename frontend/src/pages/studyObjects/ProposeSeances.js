import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Link,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Switch,
  Chip
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import axios from "axios";
import ObjectiveSelectorModal from '../../components/sequences/ObjectiveSelectorModal';
import ResourceSelectorModal from '../../components/resources/ResourceSelectorModal';

const ProposeSeances = () => {
  const { id } = useParams(); // ID de la séquence
  const location = useLocation();
  const navigate = useNavigate();
  const [sequenceTitle, setSequenceTitle] = useState("");
  const [nombreSeances, setNombreSeances] = useState("3");
  const [autoNombreSeances, setAutoNombreSeances] = useState(false);
  const [classLevels, setClassLevels] = useState([]);
  const [niveau, setNiveau] = useState("");
  const [inclureRessources, setInclureRessources] = useState(true);
  const [instructions, setInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [seances, setSeances] = useState([]);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [editedSeances, setEditedSeances] = useState([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [objectivesMap, setObjectivesMap] = useState({});
  const [allObjectives, setAllObjectives] = useState([]);
  const [allResources, setAllResources] = useState([]);
  const [resourcesMap, setResourcesMap] = useState({});
  
  // États pour les modales
  const [objectiveModalOpen, setObjectiveModalOpen] = useState(false);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:10000";
  
  // Les étapes de la cinématique
  const steps = [
    'Configuration',
    'Génération',
    'Édition'
  ];

  useEffect(() => {
    // Récupérer le titre et les infos de la séquence
    if (location.state && location.state.title) {
      setSequenceTitle(location.state.title);
    } else {
      // Charger les données de la séquence depuis l'API
      const fetchSequence = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`${API_BASE_URL}/api/v1/sequences/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSequenceTitle(response.data.title);
        } catch (err) {
          setError("Erreur lors du chargement de la séquence");
          console.error(err);
        }
      };
      fetchSequence();
    }
  }, [id, location.state]);

  // Récupération des objectifs de la séquence et création d'une map id -> titre
  useEffect(() => {
    const fetchObjectives = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/v1/sequences/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && Array.isArray(response.data.objectives)) {
          const map = {};
          response.data.objectives.forEach(obj => {
            map[obj.id] = obj.title;
          });
          setObjectivesMap(map);
        }
      } catch (err) {
        // ignore si erreur
      }
    };
    fetchObjectives();
  }, [id, API_BASE_URL]);
  
  // Récupération de tous les objectifs pour le sélecteur
  useEffect(() => {
    const fetchAllObjectives = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/v1/objectives`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && response.data.items) {
          setAllObjectives(response.data.items);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des objectifs", err);
      }
    };
    fetchAllObjectives();
  }, [API_BASE_URL]);
  
  // Récupération des ressources disponibles
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/v1/resources`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && response.data.items) {
          setAllResources(response.data.items);
          
          // Créer une map des ressources pour l'affichage
          const map = {};
          response.data.items.forEach(res => {
            map[res.id] = res.title;
          });
          setResourcesMap(map);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des ressources", err);
      }
    };
    fetchResources();
  }, [API_BASE_URL]);
  
  // Récupérer les niveaux de classe disponibles depuis le schema du prompt YAML
  useEffect(() => {
    const token = localStorage.getItem('token');
    setError(""); // Réinitialiser les erreurs
    
    // Récupérer les niveaux de classe depuis l'API
    axios.get(`${API_BASE_URL}/api/v1/ai/resource-types/seance/generator/schema`, { 
      headers: { Authorization: `Bearer ${token}` } 
    })
    .then(res => {
      console.log('Schéma du prompt récupéré:', JSON.stringify(res.data, null, 2));
      
      // Déboguer le schéma pour comprendre sa structure
      if (res.data) {
        console.log('Structure du schéma:', Object.keys(res.data));
        if (res.data.fields) {
          console.log('Champs disponibles:', res.data.fields.map(f => f.name));
        }
        
        // Méthode 1: Rechercher le champ niveau via find
        if (res.data.fields && Array.isArray(res.data.fields)) {
          const niveauClasseField = res.data.fields.find(field => field.name === 'niveau');
          console.log('Champ niveau trouvé:', niveauClasseField);
          
          if (niveauClasseField && niveauClasseField.validations && niveauClasseField.validations.enum) {
            console.log('Niveaux de classe disponibles via enum:', niveauClasseField.validations.enum);
            setClassLevels(niveauClasseField.validations.enum);
            if (niveauClasseField.validations.enum.length > 0) {
              setNiveau(niveauClasseField.validations.enum[0]);
            }
          }
          // Méthode 2: Rechercher via enum directement dans le champ
          else if (niveauClasseField && niveauClasseField.enum) {
            console.log('Niveaux de classe disponibles via champ enum:', niveauClasseField.enum);
            setClassLevels(niveauClasseField.enum);
            if (niveauClasseField.enum.length > 0) {
              setNiveau(niveauClasseField.enum[0]);
            }
          }
          // Pour déboguer, vérifier si le champ existe mais pas l'enum
          else if (niveauClasseField) {
            console.log('Champ niveau trouvé mais pas d\'enum:', niveauClasseField);
            setError("Schéma incomplet : le champ niveau existe mais ne contient pas de valeurs d'énumération.");
            setClassLevels([]);
          } else {
            setError("Schéma incomplet : le champ niveau n'a pas été trouvé dans le schéma.");
            setClassLevels([]);
          }
        }
      }
    })
    .catch(err => {
      console.error('Erreur lors de la récupération du schéma:', err);
      setError("Impossible de récupérer les niveaux de classe depuis l'API. Veuillez réessayer ou contacter l'administrateur.");
      setClassLevels([]);
    });
  }, [API_BASE_URL]);

  const handleConfigSubmit = (e) => {
    e.preventDefault();
    setActiveStep(1); // Passer à l'étape de génération
    handleGenerationSubmit();
  };

  const handleGenerationSubmit = async () => {
    setGenerating(true);
    setError("");
    
    try {
      const token = localStorage.getItem('token');
      
      // Préparer les données pour l'appel API
      const requestData = {
        sequence_id: parseInt(id),
        nombre_seances: autoNombreSeances ? "auto" : nombreSeances,
        inclure_ressources: inclureRessources,
        niveau: niveau,
        instructions_supplementaires: instructions
      };
      
      // Appel API pour générer les séances
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/ai/generate-sessions`,
        requestData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Traiter la réponse
      if (response.data && response.data.sessions) {
        setSeances(response.data.sessions);
        setEditedSeances(response.data.sessions);
        setActiveStep(2); // Passer à l'étape d'édition
      } else {
        setError("Aucune séance n'a été générée. Veuillez réessayer.");
      }
    } catch (error) {
      console.error(error);
      setError(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleEditorChange = (index, newData) => {
    const updatedSeances = [...editedSeances];
    updatedSeances[index] = newData;
    setEditedSeances(updatedSeances);
  };
  
  // Gestion des modifications d'objectifs
  const handleObjectivesChange = (objectives) => {
    handleEditorChange(currentEditIndex, {
      ...editedSeances[currentEditIndex],
      objective_ids: objectives
    });
  };
  
  // Gestion des modifications de ressources
  const handleResourcesChange = (resources) => {
    handleEditorChange(currentEditIndex, {
      ...editedSeances[currentEditIndex],
      resource_ids: resources
    });
  };
  
  // Ouvrir la modale de sélection d'objectifs
  const openObjectiveModal = () => {
    setObjectiveModalOpen(true);
  };
  
  // Fermer la modale de sélection d'objectifs
  const closeObjectiveModal = () => {
    setObjectiveModalOpen(false);
  };
  
  // Sauvegarder les objectifs sélectionnés depuis la modale
  const handleSaveObjectives = (selectedObjectives) => {
    handleObjectivesChange(selectedObjectives.map(obj => obj.id));
    setObjectiveModalOpen(false);
  };
  
  // Ouvrir la modale de sélection de ressources
  const openResourceModal = () => {
    setResourceModalOpen(true);
  };
  
  // Fermer la modale de sélection de ressources
  const closeResourceModal = () => {
    setResourceModalOpen(false);
  };
  
  // Sauvegarder les ressources sélectionnées depuis la modale
  const handleSaveResources = (selectedResources) => {
    handleResourcesChange(selectedResources.map(res => res.id));
    setResourceModalOpen(false);
  };

  const handlePrevResult = () => {
    setCurrentEditIndex(Math.max(0, currentEditIndex - 1));
  };

  const handleNextResult = () => {
    setCurrentEditIndex(Math.min(editedSeances.length - 1, currentEditIndex + 1));
  };

  const handleSaveSeances = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Enregistrer chaque séance éditée
      const promises = editedSeances.map(seance => 
        axios.post(
          `${API_BASE_URL}/api/v1/sessions/`,
          seance,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      
      await Promise.all(promises);
      
      // Rediriger vers la page de la séquence avec un message de succès
      navigate(`/sequences/${id}`, { 
        state: { 
          refresh: true, 
          messageSuccess: `${editedSeances.length} séances ont été créées avec succès!` 
        } 
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement des séances");
      console.error(err);
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleBackToConfig = () => {
    setActiveStep(0);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, mb: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Proposition de séances pour la séquence: {sequenceTitle}
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ my: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {activeStep === 0 && (
            <form onSubmit={handleConfigSubmit}>
              <Typography variant="h6" gutterBottom>
                Configuration de la génération
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel id="niveau-select-label">Niveau des apprenants</InputLabel>
                    <Select
                      labelId="niveau-select-label"
                      value={niveau}
                      onChange={(e) => setNiveau(e.target.value)}
                      label="Niveau des apprenants"
                    >
                      {classLevels.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    <TextField
                      type="number"
                      label="Nombre de séances"
                      value={nombreSeances}
                      onChange={(e) => setNombreSeances(e.target.value)}
                      fullWidth
                      disabled={autoNombreSeances}
                      InputProps={{ inputProps: { min: 1, max: 10 } }}
                      sx={{ mr: 2 }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoNombreSeances}
                          onChange={(e) => setAutoNombreSeances(e.target.checked)}
                        />
                      }
                      label="Auto"
                      labelPlacement="top"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={inclureRessources}
                        onChange={(e) => setInclureRessources(e.target.checked)}
                      />
                    }
                    label="Proposer des ressources"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Instructions supplémentaires (facultatif)"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Précisez vos attentes spécifiques pour la génération des séances"
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => navigate(-1)}
                  sx={{ mr: 2 }}
                >
                  Annuler
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                >
                  Continuer
                </Button>
              </Box>
            </form>
          )}
          
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Génération des séances
              </Typography>
              
              <Paper elevation={3} sx={{ p: 3, my: 2, bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <CircularProgress size={60} sx={{ mb: 2, color: '#1976d2' }} />
                  <Typography variant="h6" gutterBottom color="primary">
                    Génération en cours...
                  </Typography>
                  <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
                    L'intelligence artificielle génère des séances adaptées à votre séquence.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Cette opération peut prendre jusqu'à 30 secondes selon la complexité de votre séquence.
                  </Typography>
                </Box>
              </Paper>
              
              {error && (
                <Box sx={{ mt: 2 }}>
                  <Alert 
                    severity="error"
                    action={
                      <Button color="inherit" size="small" onClick={handleBackToConfig}>
                        Retour à la configuration
                      </Button>
                    }
                  >
                    {typeof error === 'string'
                      ? error
                      : error?.response?.data?.detail
                        || error?.message
                        || JSON.stringify(error)}
                  </Alert>
                </Box>
              )}
            </Box>
          )}
          
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Modification des séances générées
              </Typography>
              
              {editedSeances.length > 0 ? (
                <Box>
                  <Paper elevation={3} sx={{ p: 3, my: 2 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Séance {currentEditIndex + 1} / {editedSeances.length}
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          label="Titre"
                          value={editedSeances[currentEditIndex]?.title || ''}
                          onChange={(e) => handleEditorChange(currentEditIndex, {
                            ...editedSeances[currentEditIndex],
                            title: e.target.value
                          })}
                          fullWidth
                          required
                          margin="normal"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Date"
                          type="datetime-local"
                          value={editedSeances[currentEditIndex]?.date ? new Date(editedSeances[currentEditIndex].date).toISOString().slice(0, 16) : ''}
                          onChange={(e) => handleEditorChange(currentEditIndex, {
                            ...editedSeances[currentEditIndex],
                            date: e.target.value
                          })}
                          fullWidth
                          required
                          InputLabelProps={{ shrink: true }}
                          margin="normal"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Durée (minutes)"
                          type="number"
                          value={editedSeances[currentEditIndex]?.duration || ''}
                          onChange={(e) => handleEditorChange(currentEditIndex, {
                            ...editedSeances[currentEditIndex],
                            duration: parseInt(e.target.value)
                          })}
                          fullWidth
                          InputProps={{ inputProps: { min: 5 } }}
                          margin="normal"
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          label="Notes"
                          value={editedSeances[currentEditIndex]?.notes || ''}
                          onChange={(e) => handleEditorChange(currentEditIndex, {
                            ...editedSeances[currentEditIndex],
                            notes: e.target.value
                          })}
                          fullWidth
                          multiline
                          rows={4}
                          margin="normal"
                        />
                      </Grid>
                      
                      {/* Affichage des objectifs associés avec bouton pour ouvrir la modale */}
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2">
                              Objectifs associés :
                            </Typography>
                            <Button 
                              variant="outlined" 
                              size="small" 
                              onClick={openObjectiveModal}
                            >
                              Sélectionner des objectifs
                            </Button>
                          </Box>
                          
                          {/* Affichage des objectifs sélectionnés */}
                          {editedSeances[currentEditIndex]?.objective_ids?.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {editedSeances[currentEditIndex].objective_ids.map((objId) => (
                                <Chip 
                                  key={objId} 
                                  label={objectivesMap[objId] || allObjectives.find(o => o.id === objId)?.title || `Objectif ${objId}`} 
                                  size="small" 
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Aucun objectif sélectionné
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                      
                      {/* Sélection et affichage des ressources associées */}
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2">
                              Ressources associées :
                            </Typography>
                            <Button 
                              variant="outlined" 
                              size="small" 
                              onClick={openResourceModal}
                            >
                              Sélectionner des ressources
                            </Button>
                          </Box>
                          
                          {/* Affichage des ressources sélectionnées */}
                          {editedSeances[currentEditIndex]?.resource_ids?.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {editedSeances[currentEditIndex].resource_ids.map((resId) => (
                                <Chip 
                                  key={resId} 
                                  label={resourcesMap[resId] || allResources.find(r => r.id === resId)?.title || `Ressource ${resId}`} 
                                  size="small" 
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Aucune ressource sélectionnée
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                      <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={handlePrevResult}
                        disabled={currentEditIndex === 0}
                      >
                        Précédent
                      </Button>
                      
                      {currentEditIndex < editedSeances.length - 1 ? (
                        <Button
                          endIcon={<ArrowForwardIcon />}
                          variant="contained"
                          onClick={handleNextResult}
                        >
                          Suivant
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleSaveSeances}
                        >
                          Enregistrer toutes les séances
                        </Button>
                      )}
                    </Box>
                  </Paper>
                </Box>
              ) : (
                <Alert severity="warning">
                  Aucune séance n'a été générée. Veuillez revenir à l'étape de configuration et réessayer.
                </Alert>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {typeof error === 'string'
                    ? error
                    : error?.response?.data?.detail
                      || error?.message
                      || JSON.stringify(error)}
                </Alert>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBackToConfig}
                >
                  Retour à la configuration
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
      
      {/* Modales de sélection */}
      <ObjectiveSelectorModal
        open={objectiveModalOpen}
        onClose={closeObjectiveModal}
        initialSelectedObjectives={editedSeances[currentEditIndex]?.objective_ids?.map(id => {
          const obj = allObjectives.find(o => o.id === id);
          return obj || { id: id, title: objectivesMap[id] || `Objectif ${id}` };
        }) || []}
        onSave={handleSaveObjectives}
      />
      
      <ResourceSelectorModal
        open={resourceModalOpen}
        onClose={closeResourceModal}
        initialSelectedResources={editedSeances[currentEditIndex]?.resource_ids?.map(id => {
          const res = allResources.find(r => r.id === id);
          return res || { id: id, title: resourcesMap[id] || `Ressource ${id}` };
        }) || []}
        onSave={handleSaveResources}
      />
    </Box>
  );
};

export default ProposeSeances;
