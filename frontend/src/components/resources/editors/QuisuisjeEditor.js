import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Lightbulb as LightbulbIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';
import JsonChatBot from '../../jsonChat/JsonChatBot';

/**
 * Éditeur structuré pour les exercices "Qui suis-je"
 * Interface graphique avec gestion des mots et indices
 */
const QuisuisjeEditor = ({
  initialData,
  onSave,
  onCancel,
  submitting = false
}) => {
  // États principaux
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [niveau, setNiveau] = useState('');
  const [theme, setTheme] = useState('');
  const [vocabulaire, setVocabulaire] = useState([]);
  const [error, setError] = useState('');

  // État pour le chat IA
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // États pour l'édition de mots
  const [showWordDialog, setShowWordDialog] = useState(false);
  const [editingWordIndex, setEditingWordIndex] = useState(-1);
  const [wordText, setWordText] = useState('');
  const [wordIndices, setWordIndices] = useState(['', '', '', '']);
  const [currentHintIndex, setCurrentHintIndex] = useState('');

  // Niveaux disponibles
  const niveauxDisponibles = [
    '6ème faible', '6ème', '6ème élevé',
    '5ème faible', '5ème', '5ème élevé',
    '4ème faible', '4ème', '4ème élevé',
    '3ème faible', '3ème', '3ème élevé'
  ];

  // Initialiser avec les données existantes
  useEffect(() => {
    if (initialData?.data_json) {
      const data = initialData.data_json;
      setTitre(data.titre || '');
      setDescription(data.description || '');
      setNiveau(data.niveau || '');
      setTheme(data.theme || '');
      setVocabulaire(data.vocabulaire || []);
    }
  }, [initialData]);

  // Gestionnaires pour les mots
  const handleAddWord = () => {
    setEditingWordIndex(-1);
    setWordText('');
    setWordIndices(['', '', '', '']);
    setCurrentHintIndex('');
    setShowWordDialog(true);
  };

  const handleEditWord = (index) => {
    const word = vocabulaire[index];
    setEditingWordIndex(index);
    setWordText(word.word);
    setWordIndices(word.indices.length >= 4 ? word.indices : [...word.indices, ...Array(4 - word.indices.length).fill('')]);
    setCurrentHintIndex('');
    setShowWordDialog(true);
  };

  const handleDeleteWord = (index) => {
    const newVocabulaire = vocabulaire.filter((_, i) => i !== index);
    setVocabulaire(newVocabulaire);
  };

  const handleSaveWord = () => {
    if (!wordText.trim()) {
      setError('Le mot à deviner est obligatoire');
      return;
    }

    const validIndices = wordIndices.filter(hint => hint.trim());
    if (validIndices.length < 2) {
      setError('Au moins 2 indices sont requis');
      return;
    }

    if (validIndices.length > 6) {
      setError('Maximum 6 indices autorisés');
      return;
    }

    const newWord = {
      word: wordText.trim().toLowerCase(),
      indices: validIndices
    };

    let newVocabulaire;
    if (editingWordIndex >= 0) {
      newVocabulaire = [...vocabulaire];
      newVocabulaire[editingWordIndex] = newWord;
    } else {
      newVocabulaire = [...vocabulaire, newWord];
    }

    setVocabulaire(newVocabulaire);
    setShowWordDialog(false);
    setError('');
  };

  const handleIndexChange = (index, value) => {
    const newIndices = [...wordIndices];
    newIndices[index] = value;
    setWordIndices(newIndices);
  };

  const handleAddIndex = () => {
    if (wordIndices.length < 6) {
      setWordIndices([...wordIndices, '']);
    }
  };

  const handleRemoveIndex = (index) => {
    if (wordIndices.length > 2) {
      const newIndices = wordIndices.filter((_, i) => i !== index);
      setWordIndices(newIndices);
    }
  };

  const handleSubmit = () => {
    setError('');

    // Validation
    if (!titre.trim()) {
      setError('Le titre est obligatoire');
      return;
    }
    if (!niveau) {
      setError('Le niveau est obligatoire');
      return;
    }
    if (!theme.trim()) {
      setError('Le thème est obligatoire');
      return;
    }
    if (vocabulaire.length === 0) {
      setError('Au moins un mot est requis');
      return;
    }

    // Vérifier que tous les mots ont au moins 2 indices
    const invalidWords = vocabulaire.filter(word => word.indices.length < 2);
    if (invalidWords.length > 0) {
      setError('Tous les mots doivent avoir au moins 2 indices');
      return;
    }

    // Construire le JSON final
    const data = {
      titre: titre.trim(),
      description: description.trim(),
      niveau,
      theme: theme.trim(),
      vocabulaire
    };

    onSave(data);
  };

  // Gestionnaire pour les modifications via IA
  const handleAiDataChange = (modifiedData) => {
    if (modifiedData.titre) setTitre(modifiedData.titre);
    if (modifiedData.description) setDescription(modifiedData.description);
    if (modifiedData.niveau) setNiveau(modifiedData.niveau);
    if (modifiedData.theme) setTheme(modifiedData.theme);
    if (Array.isArray(modifiedData.vocabulaire)) {
      setVocabulaire(modifiedData.vocabulaire);
    }
  };

  // Données actuelles pour le chat IA
  const getCurrentData = () => ({
    titre: titre.trim(),
    description: description.trim(),
    niveau,
    theme: theme.trim(),
    vocabulaire
  });

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#1e293b' }}>
      {/* Zone principale d'édition */}
      <Box sx={{
        flex: showAiChat ? 2 : 1,
        p: 3,
        overflow: 'auto',
        mr: showAiChat ? 1 : 0
      }}>
        {/* Header avec bouton IA */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: '#f8fafc' }}>
            Configuration du jeu "Qui suis-je"
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PsychologyIcon />}
            endIcon={showAiChat ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowAiChat(!showAiChat)}
            disabled={submitting || aiLoading}
            sx={{
              color: '#3b82f6',
              borderColor: '#3b82f6',
              '&:hover': {
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderColor: '#2563eb'
              }
            }}
          >
            {showAiChat ? 'Masquer l\'IA' : 'Assistant IA'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Informations générales */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#f8fafc' }}>
            Informations générales
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="Titre du jeu"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              disabled={submitting}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#475569',
                  color: '#f8fafc'
                }
              }}
            />

            <FormControl fullWidth>
              <InputLabel sx={{ color: '#94a3b8' }}>Niveau</InputLabel>
              <Select
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                disabled={submitting}
                sx={{
                  backgroundColor: '#475569',
                  color: '#f8fafc'
                }}
              >
                {niveauxDisponibles.map((niv) => (
                  <MenuItem key={niv} value={niv}>{niv}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            label="Thème"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            disabled={submitting}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#475569',
                color: '#f8fafc'
              }
            }}
          />

          <TextField
            fullWidth
            label="Description (optionnel)"
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#475569',
                color: '#f8fafc'
              }
            }}
          />
        </Box>

        {/* Vocabulaire */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#f8fafc' }}>
              Mots à deviner ({vocabulaire.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddWord}
              disabled={submitting}
              sx={{
                backgroundColor: '#3b82f6',
                '&:hover': { backgroundColor: '#2563eb' }
              }}
            >
              Ajouter un mot
            </Button>
          </Box>

          {vocabulaire.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: '#94a3b8', fontStyle: 'italic' }}>
              Aucun mot configuré pour le moment.
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {vocabulaire.map((word, index) => (
                <Card key={index} sx={{ backgroundColor: '#374151' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <SmartToyIcon sx={{ color: '#60a5fa', mr: 1 }} />
                        <Typography variant="h6" sx={{ color: '#f8fafc', flex: 1 }}>
                          {word.word}
                        </Typography>
                        <Chip
                          label={`${word.indices.length} indices`}
                          size="small"
                          sx={{
                            backgroundColor: '#3b82f6',
                            color: 'white'
                          }}
                        />
                      </Box>
                      <Box>
                        <IconButton onClick={() => handleEditWord(index)} sx={{ color: '#60a5fa' }}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteWord(index)} sx={{ color: '#ef4444' }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ ml: 4 }}>
                      <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1, fontWeight: 600 }}>
                        Indices (révélés progressivement):
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {word.indices.map((hint, hintIndex) => (
                          <Chip
                            key={hintIndex}
                            label={`${hintIndex + 1}. ${hint}`}
                            size="small"
                            variant="outlined"
                            sx={{
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              borderColor: '#3b82f6',
                              color: '#60a5fa'
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        {/* Boutons d'action */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={submitting}
            sx={{ color: '#94a3b8', borderColor: '#94a3b8' }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            sx={{
              backgroundColor: '#3b82f6',
              '&:hover': { backgroundColor: '#2563eb' }
            }}
          >
            Enregistrer
          </Button>
        </Box>

        {/* Dialog d'édition de mot */}
        <Dialog
          open={showWordDialog}
          onClose={() => setShowWordDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { backgroundColor: '#1e293b', color: '#f8fafc' }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SmartToyIcon sx={{ mr: 1, color: '#3b82f6' }} />
              {editingWordIndex >= 0 ? 'Modifier le mot' : 'Ajouter un mot'}
            </Box>
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Mot à deviner"
              value={wordText}
              onChange={(e) => setWordText(e.target.value)}
              placeholder="Ex: chat, chien, maison..."
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#475569',
                  color: '#f8fafc'
                }
              }}
            />

            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <LightbulbIcon sx={{ mr: 1, color: '#fbbf24' }} />
              Indices ({wordIndices.filter(h => h.trim()).length}/6 maximum)
            </Typography>

            <Typography variant="body2" sx={{ mb: 2, color: '#94a3b8' }}>
              Les indices seront révélés progressivement au joueur. L'ordre est important !
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {wordIndices.map((hint, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 30, color: '#60a5fa' }}>
                    {index + 1}.
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder={`Indice ${index + 1}`}
                    value={hint}
                    onChange={(e) => handleIndexChange(index, e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#475569',
                        color: '#f8fafc'
                      }
                    }}
                  />
                  {wordIndices.length > 2 && (
                    <IconButton
                      onClick={() => handleRemoveIndex(index)}
                      size="small"
                      sx={{ color: '#ef4444' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>

            {wordIndices.length < 6 && (
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddIndex}
                size="small"
                sx={{
                  mt: 2,
                  color: '#3b82f6',
                  borderColor: '#3b82f6',
                  '&:hover': {
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderColor: '#2563eb'
                  }
                }}
                variant="outlined"
              >
                Ajouter un indice
              </Button>
            )}

            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#94a3b8' }}>
              💡 Astuce: Commencez par des indices généraux et devenez plus spécifique
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowWordDialog(false)} sx={{ color: '#94a3b8' }}>
              Annuler
            </Button>
            <Button onClick={handleSaveWord} variant="contained" sx={{ backgroundColor: '#3b82f6' }}>
              {editingWordIndex >= 0 ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {/* Chat IA */}
      {showAiChat && (
        <Box sx={{
          flex: 1,
          ml: 1,
          borderLeft: '1px solid #475569',
          pl: 1,
          overflow: 'hidden'
        }}>
          <JsonChatBot
            currentData={getCurrentData()}
            resourceType="exercice"
            resourceSubtype="quisuisje"
            onDataChange={handleAiDataChange}
            disabled={submitting}
            onLoadingChange={setAiLoading}
          />
        </Box>
      )}
    </Box>
  );
};

export default QuisuisjeEditor;