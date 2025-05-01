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

const ProposeSeances = () => {
  const { id } = useParams(); // ID de la séquence
  const location = useLocation();
  const navigate = useNavigate();
  const [sequenceTitle, setSequenceTitle] = useState("");
  const [nombreSeances, setNombreSeances] = useState("3");
  const [autoNombreSeances, setAutoNombreSeances] = useState(false);
  const [niveau, setNiveau] = useState("B1");
  const [inclureRessources, setInclureRessources] = useState(true);
  const [instructions, setInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [seances, setSeances] = useState([]);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [editedSeances, setEditedSeances] = useState([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [objectivesMap, setObjectivesMap] = useState({});

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
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="niveau-select-label">Niveau des apprenants</InputLabel>
                    <Select
                      labelId="niveau-select-label"
                      value={niveau}
                      onChange={(e) => setNiveau(e.target.value)}
                      label="Niveau des apprenants"
                    >
                      <MenuItem value="A1">A1 - Débutant</MenuItem>
                      <MenuItem value="A2">A2 - Élémentaire</MenuItem>
                      <MenuItem value="B1">B1 - Intermédiaire</MenuItem>
                      <MenuItem value="B2">B2 - Intermédiaire avancé</MenuItem>
                      <MenuItem value="C1">C1 - Avancé</MenuItem>
                      <MenuItem value="C2">C2 - Maîtrise</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
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
              
              <Paper elevation={3} sx={{ p: 3, my: 2, bgcolor: '#f5f5f5' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Génération en cours...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    L'intelligence artificielle génère des séances adaptées à votre séquence.
                    Cette opération peut prendre quelques instants.
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
                      
                      {/* Affichage des ID des objectifs associés */}
                      {editedSeances[currentEditIndex]?.objective_ids && 
                       editedSeances[currentEditIndex].objective_ids.length > 0 && (
                        <Grid item xs={12}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Objectifs associés :
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {editedSeances[currentEditIndex].objective_ids.map((objId, idx) => (
                                <Chip key={idx} label={objectivesMap[objId] ? objectivesMap[objId] : `Objectif ${objId}`} size="small" />
                              ))}
                            </Box>
                          </Paper>
                        </Grid>
                      )}
                      
                      {/* Affichage des ID des ressources associées */}
                      {editedSeances[currentEditIndex]?.resource_ids && 
                       editedSeances[currentEditIndex].resource_ids.length > 0 && (
                        <Grid item xs={12}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Ressources associées :
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {editedSeances[currentEditIndex].resource_ids.map((resId, idx) => (
                                <Chip key={idx} label={`ID: ${resId}`} size="small" />
                              ))}
                            </Box>
                          </Paper>
                        </Grid>
                      )}
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
    </Box>
  );
};

export default ProposeSeances;
