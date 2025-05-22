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
  Link
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import axios from "axios";
import ResourceEditorForm from '../../components/ResourceEditorForm';

const ProposeWorks = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [studyObjectTitle, setStudyObjectTitle] = useState("");
  const [numWorks, setNumWorks] = useState(3);
  const [workType, setWorkType] = useState("extrait");
  const [instructions, setInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState([]); // [{status, url}]
  const [excludedAuthors, setExcludedAuthors] = useState([]);
  const [rawResults, setRawResults] = useState(null);
  const [editedResults, setEditedResults] = useState([]);
  const [editing, setEditing] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [resourceSubTypes, setResourceSubTypes] = useState([]);
  const [toSave, setToSave] = useState([]);
  const [generatedTitles, setGeneratedTitles] = useState([]);
  const [currentFormData, setCurrentFormData] = useState(null);
  const [selectedForMerge, setSelectedForMerge] = useState([]); // Nouvel état
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClassLevel, setSelectedClassLevel] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:10000";

  useEffect(() => {
    // Récupérer le titre transmis via navigation ou le recharger si besoin
    if (location.state && location.state.title) {
      setStudyObjectTitle(location.state.title);
    } else {
      // fallback : charger via API si besoin (non implémenté ici)
      setStudyObjectTitle("");
    }
  }, [location.state]);

  // Charger types et sous-types pour l'enregistrement
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_BASE_URL}/api/v1/resources/types`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(res => {
        setResourceTypes(res.data);
        const t = res.data.find(t => t.key === 'oeuvre');
        if (t) axios.get(`${API_BASE_URL}/api/v1/resources/sub-types?type_id=${t.id}`, { headers:{ Authorization:`Bearer ${token}` } })
          .then(r => setResourceSubTypes(r.data));
      });
  }, []);

  // Récupérer les niveaux de classe disponibles depuis le schema du prompt YAML
  useEffect(() => {
    const token = localStorage.getItem('token');
    setError(""); // Réinitialiser les erreurs
    
    // Récupérer les niveaux de classe depuis l'API
    // Utiliser la même API que DynamicAIForm qui récupère le schéma complet
    axios.get(`${API_BASE_URL}/api/v1/ai/resource-types/oeuvre/${workType==='extrait' ? 'extrait' : 'oeuvrecomp'}/schema`, { 
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
        
        // Méthode 1: Rechercher le champ niveau_classe via find
        if (res.data.fields && Array.isArray(res.data.fields)) {
          const niveauClasseField = res.data.fields.find(field => field.name === 'niveau_classe');
          console.log('Champ niveau_classe trouvé:', niveauClasseField);
          
          if (niveauClasseField && niveauClasseField.validations && niveauClasseField.validations.enum) {
            console.log('Niveaux de classe disponibles via enum:', niveauClasseField.validations.enum);
            setClassLevels(niveauClasseField.validations.enum);
            if (niveauClasseField.validations.enum.length > 0) {
              setSelectedClassLevel(niveauClasseField.validations.enum[0]);
            }
          }
          // Méthode 2: Rechercher via enum directement dans le champ
          else if (niveauClasseField && niveauClasseField.enum) {
            console.log('Niveaux de classe disponibles via champ enum:', niveauClasseField.enum);
            setClassLevels(niveauClasseField.enum);
            if (niveauClasseField.enum.length > 0) {
              setSelectedClassLevel(niveauClasseField.enum[0]);
            }
          }
          // Pour déboguer, vérifier si le champ existe mais pas l'enum
          else if (niveauClasseField) {
            console.log('Champ niveau_classe trouvé mais pas d\'enum:', niveauClasseField);
            setError("Schéma incomplet : le champ niveau_classe existe mais ne contient pas de valeurs d'énumération.");
            setClassLevels([]);
          } else {
            setError("Schéma incomplet : le champ niveau_classe n'a pas été trouvé dans le schéma.");
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
  }, [workType]); // Dépendance à workType pour récupérer les bons niveaux selon le type d'oeuvre

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError("");
    // Initialise les titres explicitement avec des valeurs vides pour forcer une mise à jour
    const initialTitles = Array.from({ length: numWorks }, () => "");
    setGeneratedTitles(initialTitles);
    setProgress(Array.from({ length: numWorks }, (_, i) => ({ status: 'attente', url: null })));
    
    try {
      const contents = [];
      const titles = [...initialTitles]; // Crée une copie pour les mises à jour locales
      let currentAuthors = [...excludedAuthors];
      
      for (let i = 0; i < numWorks; i++) {
        setProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'génération en cours' } : item));
        
        // Construire les instructions personnalisées en ajoutant les auteurs exclus
        let finalInstructions = instructions;
        if (currentAuthors.length > 0) {
          finalInstructions += (finalInstructions ? '\n\n' : '') + `Ne pas proposer les auteurs ou œuvres suivants : ${currentAuthors.join(', ')}.`;
        }
        
        const variables = { 
          theme: studyObjectTitle, 
          niveau_classe: selectedClassLevel || '3ème', 
          instructions_personnalisees: finalInstructions 
        };
        
        const genResponse = await axios.post(`${API_BASE_URL}/api/v1/ai/generate-resource`, { 
          type_key: 'oeuvre', 
          subtype_key: workType==='extrait' ? 'extrait' : 'oeuvrecomp', 
          variables 
        }, { 
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = genResponse.data.content;
        console.log('DEBUG GEN', data);
        
        // Mettre à jour les titres immédiatement
        const oeuvreTitle = data.titre_oeuvre || data.chapitre || data.title || `Œuvre ${i+1}`;
        console.log('TITRE DÉTECTÉ:', oeuvreTitle);
        
        titles[i] = oeuvreTitle;
        // Mettre à jour l'état avec le nouveau titre immédiatement
        setGeneratedTitles([...titles]);
        
        contents.push(data);
        setProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'généré', url: data.html_url || null } : item));
        
        // mettre à jour auteurs exclus
        if (data.auteur_oeuvre && !currentAuthors.includes(data.auteur_oeuvre)) currentAuthors.push(data.auteur_oeuvre);
        if (data.titre_oeuvre && !currentAuthors.includes(data.titre_oeuvre)) currentAuthors.push(data.titre_oeuvre);
      }
      
      setExcludedAuthors(currentAuthors);
      setRawResults(contents);
      setEditedResults(contents);
      setCurrentEditIndex(0);
      setEditing(true);
      setResults(contents.map(c => c.html_url));
      setSelectedForMerge(Array(contents.length).fill(true)); // Initialiser selectedForMerge

      // Afficher les titres finaux dans la console pour vérification
      console.log('TITRES FINAUX:', titles);
    } catch (err) {
      console.error('ERREUR DE GÉNÉRATION:', err);
      setError(err.message || "Erreur lors de la génération des œuvres.");
      setGenerating(false);
    }
    
    setGenerating(false);
  };

  const handleMergeAll = async () => {
    // Sauvegarder les dernières modifications avant la fusion
    let updatedResults = [...editedResults];

    if (currentFormData && currentEditIndex >= 0 && currentEditIndex < editedResults.length) {
      updatedResults[currentEditIndex] = currentFormData;
      // Mise à jour synchrone pour la fusion
      setEditedResults(updatedResults);
    }

    setGenerating(true);
    setError(''); // Réinitialiser l'erreur
    const links = [];
    const finalMergedTitles = []; // Pour stocker les titres des œuvres réellement fusionnées
    let mergeError = null;

    // Utiliser updatedResults au lieu de editedResults pour garantir l'utilisation des données les plus récentes
    for (let i = 0; i < updatedResults.length; i++) {
      if (!selectedForMerge[i]) { // Ne fusionner que si sélectionné
        setProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'ignoré' } : item));
        continue; // Passer à l'œuvre suivante
      }

      setProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'fusion en cours' } : item));
      const mergeForm = new FormData();
      mergeForm.append('type_key','oeuvre');
      mergeForm.append('subtype_key', workType==='extrait'?'extrait':'oeuvrecomp');
      
      // Ici, nous utilisons updatedResults qui contient les modifications les plus récentes
      mergeForm.append('data_json', JSON.stringify(updatedResults[i]));
      
      try {
        console.log(`Fusion document ${i+1}:`, updatedResults[i]); // Log pour debug
        const mergeResponse = await axios.post(`${API_BASE_URL}/api/v1/ai/merge-resource`, mergeForm, { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }});
        links.push(mergeResponse.data.html_url);
        finalMergedTitles.push(generatedTitles[i]); // Ajouter le titre de l'œuvre fusionnée
        setProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'généré', url: mergeResponse.data.html_url } : item));
      } catch (err) {
        console.error(`Erreur fusion document ${i+1}:`, err);
        mergeError = `Erreur lors de la fusion du document ${i+1}.`;
        setProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'erreur fusion' } : item));
        // Optionnel: arrêter la boucle ici si une fusion échoue ?
        // break;
      }
    }
    if (mergeError) {
      setError(mergeError + " Certains documents n'ont pas pu être générés.");
    } else {
      setResults(links);
      setToSave(links.map(() => false));
      // Conserver les titres des œuvres réellement fusionnées
      setGeneratedTitles(finalMergedTitles);
      setEditing(false); // Ne passer à l'étape suivante que si tout réussit
    }
    setGenerating(false);
  };

  // Enregistrer en base les ressources sélectionnées
  const handleSaveSelected = async () => {
    setGenerating(true);
    const token = localStorage.getItem('token');
    
    try {
      for (let i = 0; i < results.length; i++) {
        if (!toSave[i]) continue;
        // Correction : forcer les bons IDs selon le type d'œuvre
        let typeId = 4;
        let subTypeId = workType === 'extrait' ? 7 : 8;
        const formData = new FormData();
        formData.append('title', `${studyObjectTitle} - ${generatedTitles[i] || `Œuvre ${i+1}`}`);
        formData.append('description', '');
        formData.append('type_id', typeId);
        formData.append('sub_type_id', subTypeId);
        formData.append('html_path', results[i]);
        formData.append('source_type', 'ai');
        formData.append('session_ids_json', JSON.stringify([]));
        formData.append('objective_ids_json', JSON.stringify([]));
        console.log('Vérification ID objet étude avant envoi:', id, typeof id); // Ajout du console.log
        formData.append('study_object_ids_json', JSON.stringify([id]));
        await axios.post(`${API_BASE_URL}/api/v1/resources/`, formData, { headers:{ Authorization:`Bearer ${token}` } });
      }
      
      // Naviguer vers la page précédente avec une indication pour rafraîchir
      navigate(-1, { 
        state: { 
          refresh: true,
          messageSuccess: 'Les ressources ont été enregistrées avec succès.'
        } 
      });
      
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des ressources:", error);
      setError("Une erreur est survenue lors de l'enregistrement des ressources.");
    } finally {
      setGenerating(false);
    }
  };

  if (editing && rawResults) {
    const handleCheckboxChange = (index) => {
      const newSelected = [...selectedForMerge];
      newSelected[index] = !newSelected[index];
      setSelectedForMerge(newSelected);
    };

    return (
      <Box sx={{ p:2 }}>
        <Box sx={{ position: 'relative', p: 2, border: '1px solid #ddd', borderRadius: '4px' }}>
          {generating && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2, // Pour être au-dessus du contenu
                borderRadius: '4px' // Assorti au conteneur parent
              }}
            >
              <CircularProgress />
              <Typography sx={{ mt: 1 }}>Fusion en cours...</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Button onClick={() => setCurrentEditIndex(i => Math.max(i - 1, 0))} disabled={currentEditIndex === 0}>
              <ArrowBackIcon />
            </Button>
            <Typography>Document {currentEditIndex + 1} sur {editedResults.length}</Typography>
            <Button onClick={() => setCurrentEditIndex(i => Math.min(i + 1, editedResults.length - 1))} disabled={currentEditIndex === editedResults.length - 1}>
              <ArrowForwardIcon />
            </Button>
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedForMerge[currentEditIndex] || false}
                onChange={() => handleCheckboxChange(currentEditIndex)}
                name={`merge-checkbox-${currentEditIndex}`}
              />
            }
            label="Inclure cette œuvre dans la fusion finale"
            sx={{ mb: 2 }}
          />
          <ResourceEditorForm
            hideButtons={true}
            initialData={editedResults[currentEditIndex]}
            onSubmit={(newData) => {
              const arr = [...editedResults];
              arr[currentEditIndex] = newData;
              setEditedResults(arr);
            }}
            onChange={(formData) => {
              // Stocker les modifications en cours sans soumettre
              setCurrentFormData(formData);
            }}
            onCancel={() => {
              setEditing(false);
              setCurrentEditIndex(0);
            }}
          />
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleMergeAll} disabled={generating}>Fusionner et générer</Button>
            <Button sx={{ ml: 2 }} onClick={() => { setEditing(false); setCurrentEditIndex(0); }}>Annuler</Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Proposer des œuvres associées
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Objet d'étude : <strong>{studyObjectTitle || id}</strong>
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Nombre d'œuvres à générer"
              type="number"
              value={numWorks}
              onChange={e => setNumWorks(Number(e.target.value))}
              inputProps={{ min: 1, max: 10 }}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Type d'œuvres"
              select
              value={workType}
              onChange={e => setWorkType(e.target.value)}
              fullWidth
              margin="normal"
            >
              <MenuItem value="extrait">Extraits</MenuItem>
              <MenuItem value="oeuvre_complete">Œuvres complètes</MenuItem>
            </TextField>
            <TextField
              label="Niveau de classe"
              select
              value={selectedClassLevel}
              onChange={e => setSelectedClassLevel(e.target.value)}
              fullWidth
              margin="normal"
              helperText="Niveau scolaire des apprenants"
            >
              {classLevels.map((level) => (
                <MenuItem key={level} value={level}>
                  {level}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Instructions complémentaires (optionnel)"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              minRows={3}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={generating}
              >
                Générer les œuvres
              </Button>
              <Button
                variant="outlined"
                sx={{ ml: 2 }}
                onClick={() => navigate(-1)}
                disabled={generating}
              >
                Annuler
              </Button>
            </Box>
          </form>
          {generating && (
            <Paper elevation={3} sx={{ mt: 2, p: 2, background: '#0a1929', color: 'white' }}>
              <Typography variant="h6" sx={{ color: 'primary.main', mb: 1 }}>
                Avancement de la génération
              </Typography>
              <List>
                {progress.map((item, idx) => (
                  <ListItem 
                    key={`progress-${idx}-${generatedTitles[idx] || 'oeuvre'}`} // Utiliser une clé qui change avec le titre
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      background: item.status === 'généré' ? 'rgba(0,200,83,0.08)' : 'rgba(99,102,241,0.06)', // theme.palette.primary.main (bleu)
                      border: item.status === 'généré' ? '1px solid #00c853' : '1px solid',
                      borderColor: item.status === 'généré' ? '#00c853' : 'primary.main',
                      color: 'inherit',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {item.status === 'généré' && <CheckCircleIcon sx={{ color: '#00e676' }} />}
                      {(item.status === 'génération en cours' || item.status === 'fusion en cours') && <CircularProgress size={22} color="primary" />} 
                      {item.status === "dans la file d'attente" && <HourglassEmptyIcon sx={{ color: 'primary.main' }} />}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1">
                          {generatedTitles[idx] || `Œuvre ${idx + 1}`}
                        </Typography>
                      }
                      secondary={
                        item.status === 'généré' && item.url ? (
                          <span style={{ color: '#00e676', fontWeight: 500 }}>
                            Généré – <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'primary.main', textDecoration: 'underline' }}>Ouvrir le fichier</a>
                          </span>
                        ) : (
                          <span style={{ color: 'primary.main' }}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        )
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
          {!generating && results.length > 0 && (
            <Paper elevation={3} sx={{ mt: 2, p: 2, background: '#0a1929', color: 'white' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', color: '#00e676', mb: 1 }}>
                <CheckCircleIcon sx={{ mr: 1 }} /> Œuvres générées :
              </Typography>
              <FormGroup>
                {results.map((url, idx) => (
                  <FormControlLabel
                    key={idx}
                    control={<Checkbox checked={toSave[idx]} onChange={() => { const arr=[...toSave]; arr[idx]=!arr[idx]; setToSave(arr); }} />}
                    label={<span>{generatedTitles[idx] || `Œuvre ${idx+1}`} – <Link href={url} target="_blank" rel="noopener">Ouvrir</Link></span>}
                  />
                ))}
              </FormGroup>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="contained" disabled={generating} onClick={handleSaveSelected}>
                  Enregistrer les ressources sélectionnées
                </Button>
              </Box>
            </Paper>
          )}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProposeWorks;
