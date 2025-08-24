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
import DescriptionIcon from '@mui/icons-material/Description'; // Ajout pour l'icône des ressources listées
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import axios from "axios";
import ObjectiveSelectorModal from '../../components/sequences/ObjectiveSelectorModal';
import ResourceSelectorModal from '../../components/resources/ResourceSelectorModal';
import OeuvreSelectorModal from '../../components/oeuvres/OeuvreSelectorModal';

const ProposeSeances = () => {
  const { id } = useParams(); // ID de la séquence
  const location = useLocation();
  const navigate = useNavigate();
  const [sequenceTitle, setSequenceTitle] = useState("");
  const [nombreSeances, setNombreSeances] = useState("3");
  const [autoNombreSeances, setAutoNombreSeances] = useState(false);
  const [classLevels, setClassLevels] = useState([]);
  const [niveau, setNiveau] = useState("");
  const [studyObjectsWithOeuvres, setStudyObjectsWithOeuvres] = useState([]); // Stocke les objets d'étude avec leurs œuvres
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
  const [oeuvreModalOpen, setOeuvreModalOpen] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
  
  // Les étapes de la cinématique
  const steps = [
    'Configuration',
    'Génération',
    'Édition'
  ];

  useEffect(() => {
    const fetchSequenceDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/v1/sequences/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSequenceTitle(response.data.title);
        // Nouvelle logique pour extraire les objets d'étude et leurs œuvres
        if (response.data.study_objects && Array.isArray(response.data.study_objects)) {
          const detailedStudyObjects = response.data.study_objects.map(so => {
            const SOTitle = so.title || `Objet d'étude ${so.id}`; // Titre de secours
            const SOOeuvres = (so.oeuvres && Array.isArray(so.oeuvres))
              ? so.oeuvres.map(oeuvre => ({
                  id: oeuvre.id,
                  titre: oeuvre.titre || `Œuvre ${oeuvre.id}`,
                  auteur_complet: oeuvre.auteur_complet || 'Auteur non spécifié',
                  type: oeuvre.type || 'Type non spécifié',
                  resources: oeuvre.resources || [] // Ajout des ressources
                })).filter(oeuvre => oeuvre.id && oeuvre.titre) // S'assurer que les œuvres sont valides
              : [];
            return { id: so.id, title: SOTitle, oeuvres: SOOeuvres };
          });
          setStudyObjectsWithOeuvres(detailedStudyObjects);
          console.log("Données des objets d'étude avec œuvres (ProposeSeances.js):", detailedStudyObjects); // Ligne de débogage
        } else {
          setStudyObjectsWithOeuvres([]); // Initialiser comme tableau vide si aucun objet d'étude
          console.log("Aucun objet d'étude trouvé dans la réponse API (ProposeSeances.js)."); // Ligne de débogage
        }
      } catch (err) {
        setError("Erreur lors du chargement des détails de la séquence: " + (err.response?.data?.detail || err.message));
        console.error(err);
        setStudyObjectsWithOeuvres([]); // Reset en cas d'erreur
      }
    };
    fetchSequenceDetails();
  }, [id, API_BASE_URL]); // API_BASE_URL ajouté aux dépendances, location.state n'est plus utilisé ici pour le titre.

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
        const response = await axios.get(`${API_BASE_URL}/api/v1/resources?skip=0&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Réponse de /api/v1/resources (response.data):", JSON.parse(JSON.stringify(response.data)));
        if (response.data && response.data.items) {
      console.log("Réponse de /api/v1/resources (response.data.items):", JSON.parse(JSON.stringify(response.data.items)));
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
    }; // Fin de la définition de fetchResources

    fetchResources(); // Appel de la fonction ici
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
            } else {
              console.warn("La liste enum pour 'niveau' est vide.");
            }
          } else {
            console.warn("Le champ 'niveau' ou ses validations 'enum' sont introuvables dans le schéma.");
          }
        } else {
          console.warn("La propriété 'fields' est manquante ou n'est pas un tableau dans le schéma.");
        }
      }
    })
    .catch(err => {
      console.error("Erreur lors de la récupération du schéma du prompt:", err);
      setError("Erreur lors de la récupération des niveaux de classe: " + (err.response?.data?.detail || err.message));
      setClassLevels([]); // Assure que classLevels est un tableau même en cas d'erreur
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
    setSeances([]);
    setEditedSeances([]);
    setCurrentEditIndex(0);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        sequence_id: parseInt(id, 10),
        nombre_seances: autoNombreSeances ? "auto" : nombreSeances, // Assure que c'est une chaîne
        niveau: niveau,
        instructions_supplementaires: instructions, // Correspond au modèle Pydantic
        inclure_ressources: true, // Valeur par défaut ou à rendre dynamique
      };
      console.log("Payload envoyé pour la génération de séances:", payload);

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/ai/generate-sessions`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && Array.isArray(response.data.sessions)) {
        const generatedSeances = response.data.sessions.map(s => ({
          ...s,
          title: s.title || "Titre non défini",
          description: s.notes || s.description || "Description non définie",
          objective_ids: s.objective_ids || [],
          resource_ids: s.resource_ids || [],
          oeuvre_ids: s.oeuvre_ids || [],
        }));
        setSeances(generatedSeances);
        setEditedSeances(JSON.parse(JSON.stringify(generatedSeances))); // Copie profonde pour l'édition
        setActiveStep(2); // Passer à l'étape d'édition
      } else {
        setError("Format de réponse inattendu de l'API.");
      }
    } catch (err) {
      console.error("Erreur lors de la génération des séances:", err);
      const errorDetail = err.response?.data?.detail || err.message || "Une erreur inconnue est survenue.";
      setError(`Erreur: ${errorDetail}`);
      setActiveStep(0); // Revenir à la configuration en cas d'erreur
    } finally {
      setGenerating(false);
    }
  };

  const handleEditorChange = (index, newData) => {
    const updatedSeances = [...editedSeances];
    updatedSeances[index] = { ...updatedSeances[index], ...newData };
    setEditedSeances(updatedSeances);
  };
  // Gestion des modifications d'objectifs
  const handleObjectivesChange = (objectives) => {
    const updatedSeances = [...editedSeances];
    updatedSeances[currentEditIndex].objective_ids = objectives.map(obj => obj.id);
    setEditedSeances(updatedSeances);
  };
  
  // Gestion des modifications de ressources
  const handleResourcesChange = (resources) => {
    const updatedSeances = [...editedSeances];
    updatedSeances[currentEditIndex].resource_ids = resources.map(res => res.id);
    setEditedSeances(updatedSeances);
  };

  // Gestion des modifications d'œuvres
  const handleOeuvresChange = (oeuvres) => {
    const updatedSeances = [...editedSeances];
    updatedSeances[currentEditIndex].oeuvre_ids = oeuvres.map(oeuvre => oeuvre.id);
    setEditedSeances(updatedSeances);
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
    handleObjectivesChange(selectedObjectives);
    closeObjectiveModal();
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
    handleResourcesChange(selectedResources);
    closeResourceModal();
  };

  // Ouvrir la modale de sélection d'œuvres
  const openOeuvreModal = () => {
    setOeuvreModalOpen(true);
  };

  // Fermer la modale de sélection d'œuvres
  const closeOeuvreModal = () => {
    setOeuvreModalOpen(false);
  };

  // Sauvegarder les œuvres sélectionnées depuis la modale
  const handleSaveOeuvres = (selectedOeuvres) => {
    handleOeuvresChange(selectedOeuvres);
    closeOeuvreModal();
  };

  const handlePrevResult = () => {
    setCurrentEditIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextResult = () => {
    setCurrentEditIndex(prev => Math.min(editedSeances.length - 1, prev + 1));
  };

  const handleSaveSeances = async () => {
    try {
      const token = localStorage.getItem('token');
      setError(""); // Réinitialiser les erreurs précédentes

      for (let i = 0; i < editedSeances.length; i++) {
        const seance = editedSeances[i];
        const singleSeancePayload = {
          sequence_id: parseInt(id, 10),
          title: seance.title,
          notes: seance.description, // 'notes' dans le schéma backend, la valeur vient de seance.description de l'UI
          date: new Date().toISOString(), // Champ date requis par le backend
          order: i, // Ce champ sera probablement ignoré par le backend car non dans SessionCreate
          objective_ids: seance.objective_ids || [],
          resource_ids: seance.resource_ids || [],
          oeuvre_ids: seance.oeuvre_ids || [], // ← AJOUTÉ : œuvres associées à la séance
          // 'notes' et 'duration' sont optionnels dans SessionBase
        };

        console.log(`Payload pour sauvegarde de la séance ${i + 1}:`, singleSeancePayload);

        await axios.post(`${API_BASE_URL}/api/v1/sessions/`, singleSeancePayload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Si toutes les sauvegardes réussissent, naviguer vers la page de la séquence
      navigate(`/sequences/${id}`);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde d'une séance:", err);
      let errorMessage = "Erreur lors de la sauvegarde d'une séance.";
      if (err.response && err.response.data && err.response.data.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage += " " + err.response.data.detail.map(d => `${d.loc ? d.loc.join('->') + ': ' : ''}${d.msg}`).join('; ');
        } else {
          errorMessage += " " + err.response.data.detail;
        }
      } else {
        errorMessage += " " + err.message;
      }
      setError(errorMessage);
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        // Gérer le cas où la date n'est pas valide
        return 'Date invalide';
    }
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleBackToConfig = () => {
    setActiveStep(0);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Proposer des Séances pour "{sequenceTitle || 'Séquence en chargement...'}"
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent>
          {activeStep === 0 && (
            <form onSubmit={handleConfigSubmit}>
              <Typography variant="h6" gutterBottom>Configuration de la Génération</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoNombreSeances}
                        onChange={(e) => setAutoNombreSeances(e.target.checked)}
                      />
                    }
                    label="Déterminer automatiquement le nombre de séances"
                  />
                </Grid>
                {!autoNombreSeances && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nombre de séances souhaitées"
                      type="number"
                      value={nombreSeances}
                      onChange={(e) => setNombreSeances(e.target.value)}
                      fullWidth
                      disabled={autoNombreSeances}
                      inputProps={{ min: 1, max: 10 }}
                    />
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="niveau-select-label">Niveau de classe</InputLabel>
                    <Select
                      labelId="niveau-select-label"
                      value={niveau}
                      label="Niveau de classe"
                      onChange={(e) => setNiveau(e.target.value)}
                    >
                      {classLevels && classLevels.length > 0 ? (
                        classLevels.map((level) => (
                          <MenuItem key={level} value={level}>
                            {level}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled value="">
                          Chargement des niveaux...
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Objets d'étude et œuvres de la séquence :
                  </Typography>
                  {studyObjectsWithOeuvres.length > 0 ? (
                    <List dense>
                      {studyObjectsWithOeuvres.map(so => (
                        <ListItem key={so.id} sx={{ display: 'block', mb: 1, p:1, border: '1px solid lightgray', borderRadius: '4px' }}>
                          <ListItemText
                            primary={so.title}
                            primaryTypographyProps={{ fontWeight: 'medium' }}
                          />
                          {so.oeuvres && so.oeuvres.length > 0 ? (
                            <List dense sx={{ pl: 2 }}>
                              {so.oeuvres.map(oeuvre => {
                                // Vérifier si l'œuvre a des ressources de type "OEUVRE"
                                const oeuvreResources = oeuvre.resources?.filter(resource => resource.type?.key === 'OEUVRE') || [];
                                const hasOeuvreResources = oeuvreResources.length > 0;

                                return (
                                  <Box key={oeuvre.id}>
                                    <ListItem sx={{
                                      p: 0,
                                      borderRadius: 1,
                                      mb: 1,
                                      border: hasOeuvreResources ? 'none' : '2px solid',
                                      borderColor: hasOeuvreResources ? 'transparent' : 'warning.main',
                                      bgcolor: hasOeuvreResources ? 'transparent' : 'rgba(255, 152, 0, 0.08)'
                                    }}>
                                      <ListItemIcon sx={{minWidth: '30px'}}>
                                        {hasOeuvreResources ? (
                                          <CheckCircleIcon fontSize="small" color="success" />
                                        ) : (
                                          <ErrorIcon fontSize="small" color="warning" />
                                        )}
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {oeuvre.titre}
                                            {!hasOeuvreResources && (
                                              <WarningIcon sx={{ fontSize: '1rem', color: 'warning.main' }} />
                                            )}
                                          </Box>
                                        }
                                        secondary={`${oeuvre.auteur_complet} - ${oeuvre.type}`}
                                        primaryTypographyProps={{
                                          fontSize: '0.9rem',
                                          color: hasOeuvreResources ? 'inherit' : 'text.primary',
                                          fontWeight: hasOeuvreResources ? 'normal' : 'medium'
                                        }}
                                        secondaryTypographyProps={{
                                          fontSize: '0.8rem',
                                          color: hasOeuvreResources ? 'inherit' : 'text.secondary'
                                        }}
                                      />
                                    </ListItem>

                                    {hasOeuvreResources ? (
                                      <List dense sx={{ pl: 4, pt: 0 }}>
                                        {oeuvreResources.map(resource => (
                                          <ListItem key={resource.id} sx={{p:0}}>
                                            <ListItemIcon sx={{minWidth: '20px'}}>
                                              <DescriptionIcon fontSize="small" sx={{ fontSize: '0.7rem' }} />
                                            </ListItemIcon>
                                            <ListItemText
                                              primary={resource.title}
                                              primaryTypographyProps={{ fontSize: '0.8rem' }}
                                            />
                                          </ListItem>
                                        ))}
                                      </List>
                                    ) : (
                                      <Box sx={{
                                        pl: 4,
                                        py: 2,
                                        mx: 1,
                                        mb: 1,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(255, 152, 0, 0.12)',
                                        border: '1px solid',
                                        borderColor: 'warning.main'
                                      }}>
                                        <Typography variant="body2" sx={{
                                          fontSize: '0.8rem',
                                          fontWeight: 'medium',
                                          color: 'warning.dark',
                                          textAlign: 'center'
                                        }}>
                                          ⚠️ Aucune ressource de type "OEUVRE" liée à cette œuvre
                                        </Typography>
                                      </Box>
                                    )}
                                  </Box>
                                );
                              })}
                            </List>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{pl:2}}>Aucune œuvre associée à cet objet d'étude.</Typography>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography>Aucun objet d'étude avec œuvres trouvé pour cette séquence.</Typography>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Instructions spécifiques pour l'IA (optionnel)"
                    multiline
                    rows={4}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    fullWidth
                    variant="outlined"
                    placeholder="Ex: Mettre l'accent sur la grammaire, proposer des activités ludiques..."
                  />
                </Grid>
              </Grid>
              <Button type="submit" variant="contained" sx={{ mt: 3 }} disabled={generating || !niveau || classLevels.length === 0}>
                {generating ? <CircularProgress size={24} /> : "Générer les Séances"}
              </Button>
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {typeof error === 'string'
                    ? error
                    : error?.response?.data?.detail
                      || error?.message
                      || JSON.stringify(error)}
                </Alert>
              )}
            </form>
          )}

          {activeStep === 1 && (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Génération des séances en cours...
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Veuillez patienter pendant que l'IA prépare les propositions.
              </Typography>
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Édition des Séances Proposées</Typography>
              {editedSeances.length > 0 ? (
                <Box>
                  <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h5" gutterBottom>
                      Séance {currentEditIndex + 1} / {editedSeances.length}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          label="Titre de la séance"
                          value={editedSeances[currentEditIndex]?.title || ''}
                          onChange={(e) => handleEditorChange(currentEditIndex, { title: e.target.value })}
                          fullWidth
                          sx={{ mb: 2 }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Description / Déroulement"
                          multiline
                          rows={8}
                          value={editedSeances[currentEditIndex]?.description || ''}
                          onChange={(e) => handleEditorChange(currentEditIndex, { description: e.target.value })}
                          fullWidth
                          sx={{ mb: 2 }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1">Objectifs Pédagogiques</Typography>
                            <Button size="small" onClick={openObjectiveModal}>Modifier</Button>
                          </Box>
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
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1">Ressources</Typography>
                            <Button size="small" onClick={openResourceModal}>Modifier</Button>
                          </Box>
                          {editedSeances[currentEditIndex]?.resource_ids?.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {editedSeances[currentEditIndex].resource_ids.map((resId) => {
                                // DEBUGGING:
                                console.log(`--- Débogage pour Ressource ID: ${resId} ---`);
                                console.log("Contenu de resourcesMap:", JSON.parse(JSON.stringify(resourcesMap)));
                                // Pour un débogage plus approfondi si nécessaire, décommentez la ligne suivante :
                                // console.log("Contenu de allResources:", JSON.parse(JSON.stringify(allResources)));
                                const resourceFromMap = resourcesMap[resId];
                                const resourceFromFind = allResources.find(r => r.id === resId);
                                console.log(`Recherche pour ID ${resId}:`);
                                console.log("  Titre depuis resourcesMap:", resourceFromMap);
                                console.log("  Objet ressource depuis allResources.find():", resourceFromFind ? JSON.parse(JSON.stringify(resourceFromFind)) : "Non trouvé");
                                const finalLabel = resourceFromMap || (resourceFromFind && resourceFromFind.title) || `Ressource ${resId}`;
                                console.log(`  Label final calculé: ${finalLabel}`);
                                console.log(`--- Fin débogage pour Ressource ID: ${resId} ---`);
                                // FIN DEBUGGING

                                return (
                                  <Chip
                                    key={resId}
                                    label={finalLabel}
                                    size="small"
                                    sx={{ mr: 1, mb: 1 }}
                                  />
                                );
                              })}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Aucune ressource sélectionnée
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1">Œuvres</Typography>
                            <Button size="small" onClick={openOeuvreModal}>Modifier</Button>
                          </Box>
                          {editedSeances[currentEditIndex]?.oeuvre_ids?.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {editedSeances[currentEditIndex].oeuvre_ids.map((oeuvreId) => {
                                // Trouver l'œuvre dans studyObjectsWithOeuvres
                                let oeuvreLabel = `Œuvre ${oeuvreId}`;
                                for (const studyObject of studyObjectsWithOeuvres) {
                                  const oeuvre = studyObject.oeuvres?.find(o => o.id === oeuvreId);
                                  if (oeuvre) {
                                    oeuvreLabel = `${oeuvre.titre} - ${oeuvre.auteur_complet}`;
                                    break;
                                  }
                                }

                                return (
                                  <Chip
                                    key={oeuvreId}
                                    label={oeuvreLabel}
                                    size="small"
                                    sx={{
                                      mr: 1,
                                      mb: 1,
                                      backgroundColor: 'secondary.light',
                                      color: 'secondary.contrastText',
                                      '&:hover': {
                                        backgroundColor: 'secondary.main',
                                      }
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Aucune œuvre sélectionnée
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

      <OeuvreSelectorModal
        open={oeuvreModalOpen}
        onClose={closeOeuvreModal}
        initialSelectedOeuvres={editedSeances[currentEditIndex]?.oeuvre_ids?.map(id => {
          // Trouver l'œuvre dans studyObjectsWithOeuvres
          for (const studyObject of studyObjectsWithOeuvres) {
            const oeuvre = studyObject.oeuvres?.find(o => o.id === id);
            if (oeuvre) {
              return oeuvre;
            }
          }
          return { id: id, titre: `Œuvre ${id}`, auteur_complet: 'Auteur non spécifié' };
        }) || []}
        onSave={handleSaveOeuvres}
      />
    </Box>
  );
};

export default ProposeSeances;
