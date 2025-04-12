import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardHeader, 
  CardContent,
  CardActions,
  Button,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  FormControlLabel,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  Flag as FlagIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import sequenceService from '../../services/sequenceService';
import objectiveService from '../../services/objectiveService';

/**
 * Composant permettant de gérer les objectifs associés à une séquence
 */
const ManageSequenceObjectives = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // États pour les données
  const [sequence, setSequence] = useState(null);
  const [allObjectives, setAllObjectives] = useState([]);
  const [selectedObjectives, setSelectedObjectives] = useState([]);
  const [initialObjectives, setInitialObjectives] = useState([]);
  
  // États pour le filtrage et la recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredObjectives, setFilteredObjectives] = useState([]);
  
  // États pour le chargement et les erreurs
  const [loading, setLoading] = useState(true);
  const [savingChanges, setSavingChanges] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Charger la séquence
        const sequenceData = await sequenceService.getSequenceById(id);
        setSequence(sequenceData);
        
        // Enregistrer les objectifs initiaux de la séquence
        const initialObjectiveIds = sequenceData.objectives ? 
          sequenceData.objectives.map(obj => obj.id) : [];
        setInitialObjectives(initialObjectiveIds);
        setSelectedObjectives(initialObjectiveIds);
        
        // Charger tous les objectifs disponibles
        const objectivesData = await objectiveService.getObjectives();
        setAllObjectives(objectivesData);
        
        setError('');
      } catch (err) {
        setError("Erreur lors du chargement des données: " + 
          (err.detail || err.message || "Erreur inconnue"));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  // Filtrer les objectifs en fonction de la recherche
  useEffect(() => {
    if (allObjectives.length > 0) {
      const filtered = allObjectives.filter(obj => 
        obj.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (obj.description && obj.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredObjectives(filtered);
    } else {
      setFilteredObjectives([]);
    }
  }, [allObjectives, searchQuery]);
  
  // Gérer la sélection/désélection d'un objectif
  const handleObjectiveToggle = (objectiveId) => {
    setSelectedObjectives(prev => {
      if (prev.includes(objectiveId)) {
        return prev.filter(id => id !== objectiveId);
      } else {
        return [...prev, objectiveId];
      }
    });
  };
  
  // Vérifier si des modifications ont été apportées
  const hasChanges = () => {
    if (initialObjectives.length !== selectedObjectives.length) return true;
    
    // Vérifier si tous les objectifs initiaux sont dans la sélection actuelle
    return !initialObjectives.every(id => selectedObjectives.includes(id));
  };
  
  // Sauvegarder les modifications
  const saveChanges = async () => {
    try {
      setSavingChanges(true);
      setError('');
      setSuccess('');
      
      // Objectifs à ajouter (présents dans selectedObjectives mais pas dans initialObjectives)
      const objectivesToAdd = selectedObjectives.filter(id => !initialObjectives.includes(id));
      
      // Objectifs à supprimer (présents dans initialObjectives mais pas dans selectedObjectives)
      const objectivesToRemove = initialObjectives.filter(id => !selectedObjectives.includes(id));
      
      // Effectuer les modifications
      for (const objId of objectivesToAdd) {
        await sequenceService.addObjectiveToSequence(id, objId);
      }
      
      for (const objId of objectivesToRemove) {
        await sequenceService.removeObjectiveFromSequence(id, objId);
      }
      
      // Mettre à jour les objectifs initiaux
      setInitialObjectives([...selectedObjectives]);
      setSuccess("Les objectifs de la séquence ont été mis à jour avec succès !");
      
      // Mettre à jour les données de la séquence
      const updatedSequence = await sequenceService.getSequenceById(id);
      setSequence(updatedSequence);
    } catch (err) {
      setError("Erreur lors de la sauvegarde des modifications: " + 
        (err.detail || err.message || "Erreur inconnue"));
    } finally {
      setSavingChanges(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !sequence) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Retour
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Card>
        <CardHeader
          title={
            <Typography variant="h5">
              Gestion des objectifs pour la séquence : {sequence?.title}
            </Typography>
          }
        />
        
        <Divider />
        
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                placeholder="Rechercher un objectif..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Objectifs disponibles
              </Typography>
              
              <Paper variant="outlined" sx={{ maxHeight: '400px', overflow: 'auto', p: 1 }}>
                {filteredObjectives.length > 0 ? (
                  <List>
                    {filteredObjectives.map((objective) => (
                      <ListItem key={objective.id} divider>
                        <ListItemIcon>
                          <FlagIcon color="secondary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={objective.title}
                          secondary={objective.description || "Aucune description"}
                        />
                        <ListItemSecondaryAction>
                          <FormControlLabel
                            control={
                              <Checkbox
                                edge="end"
                                checked={selectedObjectives.includes(objective.id)}
                                onChange={() => handleObjectiveToggle(objective.id)}
                                disabled={savingChanges}
                              />
                            }
                            label=""
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    {searchQuery 
                      ? "Aucun objectif ne correspond à votre recherche." 
                      : "Aucun objectif disponible."}
                  </Typography>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6">
                  Objectifs sélectionnés ({selectedObjectives.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  {hasChanges() 
                    ? "Modifications non sauvegardées" 
                    : "Aucune modification"}
                </Typography>
              </Box>
              
              <Paper variant="outlined" sx={{ p: 1, mt: 1 }}>
                {selectedObjectives.length > 0 ? (
                  <List>
                    {allObjectives
                      .filter(obj => selectedObjectives.includes(obj.id))
                      .map((objective) => (
                        <ListItem key={objective.id} divider>
                          <ListItemIcon>
                            <FlagIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={objective.title}
                            secondary={objective.description || "Aucune description"}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => handleObjectiveToggle(objective.id)}
                              disabled={savingChanges}
                              color="error"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    Aucun objectif sélectionné pour cette séquence.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
        
        <Divider />
        
        <CardActions>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/sequences/${id}`)}
            variant="outlined"
          >
            Retour à la séquence
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={savingChanges ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
            onClick={saveChanges}
            disabled={!hasChanges() || savingChanges}
            sx={{ ml: 'auto' }}
          >
            {savingChanges ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </CardActions>
      </Card>
    </Box>
  );
};

export default ManageSequenceObjectives;
