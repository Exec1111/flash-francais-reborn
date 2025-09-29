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
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import JsonChatBot from '../../jsonChat/JsonChatBot';

/**
 * Éditeur structuré pour les exercices de vocabulaire
 * Interface graphique avec gestion des paires mot-définition
 */
const VocabulaireEditor = ({
  initialData,
  onSave,
  onCancel,
  submitting = false
}) => {
  // États principaux
  const [vocabulaire, setVocabulaire] = useState([]);
  const [error, setError] = useState('');

  // État pour le chat IA
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // États pour l'édition des paires
  const [showPairDialog, setShowPairDialog] = useState(false);
  const [editingPairIndex, setEditingPairIndex] = useState(-1);
  const [pairWord, setPairWord] = useState('');
  const [pairDefinition, setPairDefinition] = useState('');
  const [pairExample, setPairExample] = useState('');


  // Initialiser avec les données existantes
  useEffect(() => {
    if (initialData?.data_json) {
      const data = initialData.data_json;
      setVocabulaire(data.vocabulaire || []);
    }
  }, [initialData]);

  // Gestionnaires pour les paires vocabulaire
  const handleAddPair = () => {
    setEditingPairIndex(-1);
    setPairWord('');
    setPairDefinition('');
    setShowPairDialog(true);
  };

  const handleEditPair = (index) => {
    const pair = vocabulaire[index];
    setEditingPairIndex(index);
    setPairWord(pair.word);
    setPairDefinition(pair.definition);
    setPairExample(pair.exemple || '');
    setShowPairDialog(true);
  };

  const handleDeletePair = (index) => {
    const newVocabulaire = vocabulaire.filter((_, i) => i !== index);
    setVocabulaire(newVocabulaire);
  };

  const handleSavePair = () => {
    if (!pairWord.trim()) {
      setError('Le mot est obligatoire');
      return;
    }

    if (!pairDefinition.trim()) {
      setError('La définition est obligatoire');
      return;
    }

    const newPair = {
      word: pairWord.trim(),
      definition: pairDefinition.trim(),
      exemple: pairExample.trim()
    };

    let newVocabulaire;
    if (editingPairIndex >= 0) {
      newVocabulaire = [...vocabulaire];
      newVocabulaire[editingPairIndex] = newPair;
    } else {
      newVocabulaire = [...vocabulaire, newPair];
    }

    setVocabulaire(newVocabulaire);
    setShowPairDialog(false);
    setError('');
  };

  const handleSubmit = () => {
    setError('');

    // Validation
    if (vocabulaire.length === 0) {
      setError('Au moins une paire mot-définition est requise');
      return;
    }

    // Construire le JSON final
    const data = {
      vocabulaire
    };

    onSave(data);
  };

  // Gestionnaire pour les modifications via IA
  const handleAiDataChange = (modifiedData) => {
    if (Array.isArray(modifiedData.vocabulaire)) {
      setVocabulaire(modifiedData.vocabulaire);
    }
  };

  // Données actuelles pour le chat IA
  const getCurrentData = () => ({
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
            Configuration de l'activité Vocabulaire
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

        {/* Paires vocabulaire */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#f8fafc' }}>
              Paires vocabulaire ({vocabulaire.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddPair}
              disabled={submitting}
              sx={{
                backgroundColor: '#3b82f6',
                '&:hover': { backgroundColor: '#2563eb' }
              }}
            >
              Ajouter une paire
            </Button>
          </Box>

          {vocabulaire.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: '#94a3b8', fontStyle: 'italic' }}>
              Aucune paire vocabulaire configurée pour le moment.
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {vocabulaire.map((pair, index) => (
                <Card key={index} sx={{ backgroundColor: '#374151' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ color: '#f8fafc', mb: 1 }}>
                          {pair.word}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#d1d5db' }}>
                          {pair.definition}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton onClick={() => handleEditPair(index)} sx={{ color: '#60a5fa' }}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeletePair(index)} sx={{ color: '#ef4444' }}>
                          <DeleteIcon />
                        </IconButton>
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

        {/* Dialog d'édition de paire */}
        <Dialog
          open={showPairDialog}
          onClose={() => setShowPairDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { backgroundColor: '#1e293b', color: '#f8fafc' }
          }}
        >
          <DialogTitle>
            {editingPairIndex >= 0 ? 'Modifier la paire' : 'Ajouter une paire'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Mot"
              value={pairWord}
              onChange={(e) => setPairWord(e.target.value)}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#475569',
                  color: '#f8fafc'
                }
              }}
            />
            <TextField
              fullWidth
              label="Définition"
              multiline
              rows={3}
              value={pairDefinition}
              onChange={(e) => setPairDefinition(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#475569',
                  color: '#f8fafc'
                }
              }}
            />
            <Typography variant="body2" sx={{ fontSize: '0.9rem', color: '#666', mt: 1 }}>
              Exemple d'utilisation :
            </Typography>
            <TextField
              fullWidth
              label="Exemple"
              value={pairExample}
              onChange={(e) => setPairExample(e.target.value)}
              sx={{
                mt: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#475569',
                  color: '#f8fafc'
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPairDialog(false)} sx={{ color: '#94a3b8' }}>
              Annuler
            </Button>
            <Button onClick={handleSavePair} variant="contained" sx={{ backgroundColor: '#3b82f6' }}>
              {editingPairIndex >= 0 ? 'Modifier' : 'Ajouter'}
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
            resourceSubtype="vocabulaire"
            onDataChange={handleAiDataChange}
            disabled={submitting}
            onLoadingChange={setAiLoading}
          />
        </Box>
      )}
    </Box>
  );
};

export default VocabulaireEditor;
