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
  FormHelperText
} from '@mui/material';
import api from '../../services/api';

const ConfigurationStep = ({
  sessionId,
  onContinue,
  onClose,
  initialConfig = { niveau_classe: '', nombre_ressources: '' }
}) => {
  const [config, setConfig] = useState(initialConfig);
  const [classLevels, setClassLevels] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);

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
          } else {
            console.log('Champ niveau_classe non trouvé dans le schéma, utilisation des valeurs specifiées manuellement');
            // Valeurs correspondant à celles définies dans le fichier YAML
            setClassLevels([
              "6ème faible", "6ème", "6ème élevé", 
              "5ème faible", "5ème", "5ème élevé", 
              "4ème faible", "4ème", "4ème élevé", 
              "3ème faible", "3ème", "3ème élevé"
            ]);
          }
        } else {
          console.log('Structure de schéma inattendue, utilisation des valeurs spécifiées manuellement');
          // Valeurs correspondant à celles définies dans le fichier YAML
          setClassLevels([
            "6ème faible", "6ème", "6ème élevé", 
            "5ème faible", "5ème", "5ème élevé", 
            "4ème faible", "4ème", "4ème élevé", 
            "3ème faible", "3ème", "3ème élevé"
          ]);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des niveaux de classe:", err);
        // Utiliser des valeurs correspondant à celles définies dans le fichier YAML
        setClassLevels([
          "6ème faible", "6ème", "6ème élevé", 
          "5ème faible", "5ème", "5ème élevé", 
          "4ème faible", "4ème", "4ème élevé", 
          "3ème faible", "3ème", "3ème élevé"
        ]);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onContinue(config);
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

            <TextField
              fullWidth
              label="Nombre de ressources à générer (optionnel)"
              name="nombre_ressources"
              type="number"
              value={config.nombre_ressources}
              onChange={handleChange}
              inputProps={{ min: 1, max: 10 }}
              helperText="Laissez vide pour que l'IA détermine le nombre optimal (généralement 2 à 4)"
              sx={{ mb: 2 }}
            />

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
