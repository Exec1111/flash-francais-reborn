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
  CircularProgress
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import axios from "axios";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setResults([]);
    setError("");
    setProgress(Array.from({ length: numWorks }, (_, i) => ({ status: i === 0 ? "génération en cours" : "dans la file d'attente", url: null })));
    try {
      const links = [];
      let currentAuthors = [...excludedAuthors]; // Utiliser la liste existante des auteurs exclus
      for (let i = 0; i < numWorks; i++) {
        setProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: "génération en cours" } : item));
        const type_key = "oeuvre";
        const subtype_key = workType === "extrait" ? "extrait" : "oeuvrecomp";
        // Préparation des instructions personnalisées
        let customInstructions = "";
        if (instructions && instructions.trim().length > 0) {
          customInstructions = instructions.trim();
        }
        // Toujours ajouter les auteurs exclus s'il y en a, qu'il y ait des instructions ou non
        if (currentAuthors.length > 0) {
          if (customInstructions) {
            customInstructions += "\n";
          }
          customInstructions += `Evite les auteurs et œuvres suivants : ${currentAuthors.join(", ")}`;
        }
        
        const variables = {
          theme: studyObjectTitle,
          niveau_classe: "3ème",
          instructions_personnalisees: customInstructions || instructions // Utiliser les instructions originales si pas de modifications
        };
        // 1. Générer le contenu IA
        const genResponse = await axios.post(
          `${API_BASE_URL}/api/v1/ai/generate-resource`,
          {
            type_key,
            subtype_key,
            variables
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        // Extraction de l'auteur et du titre immédiatement après la génération
        const aiData = genResponse.data;
        let author = null;
        let title = null;
        
        try {
          if (aiData && aiData.content) {
            author = aiData.content.auteur_oeuvre;
            title = aiData.content.titre_oeuvre;
            
            // Ajouter l'auteur et le titre à la liste d'exclusion s'ils ne sont pas déjà présents
            if (author && !currentAuthors.includes(author)) {
              currentAuthors.push(author);
            }
            if (title && !currentAuthors.includes(title)) {
              currentAuthors.push(title);
            }
          }
        } catch (e) {
          console.error("Erreur lors de l'extraction des données :", e);
        }
        
        setProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: "fusion en cours" } : item));
        
        // 2. Fusionner pour obtenir le HTML
        const mergeForm = new FormData();
        mergeForm.append("type_key", type_key);
        mergeForm.append("subtype_key", subtype_key);
        mergeForm.append("data_json", JSON.stringify(aiData));
        const mergeResponse = await axios.post(
          `${API_BASE_URL}/api/v1/ai/merge-resource`,
          mergeForm,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        const htmlUrl = mergeResponse.data?.html_url;
        links.push(htmlUrl);
        setProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: "généré", url: htmlUrl } : item));
        if (i + 1 < numWorks) {
          setProgress(prev => prev.map((item, idx) => idx === i + 1 ? { ...item, status: "génération en cours" } : item));
        }
      }
      setResults(links);
      // Mettre à jour la liste des auteurs exclus à la fin
      setExcludedAuthors(currentAuthors);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

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
              <Typography variant="h6" sx={{ color: '#03e9f4', mb: 1 }}>
                Avancement de la génération
              </Typography>
              <List>
                {progress.map((item, idx) => (
                  <ListItem key={idx} sx={{
                    borderRadius: 2,
                    mb: 1,
                    background: item.status === 'généré' ? 'rgba(0,200,83,0.08)' : 'rgba(3,233,244,0.06)',
                    border: item.status === 'généré' ? '1px solid #00c853' : '1px solid #03e9f4',
                    color: 'inherit',
                  }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {item.status === 'généré' && <CheckCircleIcon sx={{ color: '#00e676' }} />}
                      {(item.status === 'génération en cours' || item.status === 'fusion en cours') && <CircularProgress size={22} color="info" />}
                      {item.status === "dans la file d'attente" && <HourglassEmptyIcon sx={{ color: '#03e9f4' }} />}
                    </ListItemIcon>
                    <ListItemText
                      primary={`Œuvre ${idx + 1}`}
                      secondary={
                        item.status === 'généré' && item.url ? (
                          <span style={{ color: '#00e676', fontWeight: 500 }}>
                            Généré – <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: '#03e9f4', textDecoration: 'underline' }}>Ouvrir le fichier</a>
                          </span>
                        ) : (
                          <span style={{ color: '#03e9f4' }}>
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
              <List>
                {results.map((url, idx) => (
                  <ListItem key={idx} sx={{
                    borderRadius: 2,
                    mb: 1,
                    background: 'rgba(0,200,83,0.08)',
                    border: '1px solid #00c853',
                  }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CheckCircleIcon sx={{ color: '#00e676' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Œuvre générée ${idx + 1}`}
                      secondary={
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#03e9f4', textDecoration: 'underline' }}>
                          Ouvrir l'œuvre générée
                        </a>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProposeWorks;
