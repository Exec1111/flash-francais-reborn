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
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import JsonChatBot from '../../jsonChat/JsonChatBot';

/**
 * Éditeur structuré pour les exercices du Pendu (JSON-first)
 */
const PenduEditor = ({ initialData, onSave, onCancel, submitting = false }) => {
  const [titre, setTitre] = useState('');
  const [niveau, setNiveau] = useState('');
  const [theme, setTheme] = useState('');
  const [langue, setLangue] = useState('fr');
  const [listeMots, setListeMots] = useState([]);
  const [error, setError] = useState('');

  const [showAiChat, setShowAiChat] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [motDialog, setMotDialog] = useState({ mot_a_deviner: '', indice: '' });

  const niveauxDisponibles = [
    '6ème faible', '6ème', '6ème élevé',
    '5ème faible', '5ème', '5ème élevé',
    '4ème faible', '4ème', '4ème élevé',
    '3ème faible', '3ème', '3ème élevé'
  ];

  useEffect(() => {
    if (initialData?.data_json) {
      const data = initialData.data_json;
      setTitre(data.titre || '');
      setNiveau(data.niveau || '');
      setTheme(data.theme || '');
      setLangue(data.langue || 'fr');
      setListeMots(Array.isArray(data.liste_mots) ? data.liste_mots : []);
    }
  }, [initialData]);

  const openAddDialog = () => {
    setEditingIndex(-1);
    setMotDialog({ mot_a_deviner: '', indice: '' });
    setDialogOpen(true);
    setError('');
  };

  const openEditDialog = (index) => {
    setEditingIndex(index);
    setMotDialog({ ...listeMots[index] });
    setDialogOpen(true);
    setError('');
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setMotDialog({ mot_a_deviner: '', indice: '' });
  };

  const validateMot = (mot) => {
    if (!mot || typeof mot !== 'string') return false;
    const sanitized = mot.trim().toUpperCase()
      // Remplacer les accents par leurs équivalents sans accent
      .replace(/[ÀÁÂÃÄÅ]/g, 'A')
      .replace(/[ÈÉÊË]/g, 'E')
      .replace(/[ÌÍÎÏ]/g, 'I')
      .replace(/[ÒÓÔÕÖ]/g, 'O')
      .replace(/[ÙÚÛÜ]/g, 'U')
      .replace(/[Ç]/g, 'C')
      .replace(/[Ñ]/g, 'N')
      // Supprimer tous les caractères non alphabétiques
      .replace(/[^A-Z]/g, '');
    
    return sanitized.length > 0 && /^[A-Z]+$/.test(sanitized);
  };

  const normalizeMot = (mot) => {
    if (!mot || typeof mot !== 'string') return '';
    return mot.trim().toUpperCase()
      // Remplacer les accents par leurs équivalents sans accent
      .replace(/[ÀÁÂÃÄÅ]/g, 'A')
      .replace(/[ÈÉÊË]/g, 'E')
      .replace(/[ÌÍÎÏ]/g, 'I')
      .replace(/[ÒÓÔÕÖ]/g, 'O')
      .replace(/[ÙÚÛÜ]/g, 'U')
      .replace(/[Ç]/g, 'C')
      .replace(/[Ñ]/g, 'N')
      // Supprimer tous les caractères non alphabétiques
      .replace(/[^A-Z]/g, '');
  };

  const handleSaveMot = () => {
    const motNormalized = normalizeMot(motDialog.mot_a_deviner);
    const indiceClean = motDialog.indice.trim();

    if (!motNormalized || !validateMot(motNormalized)) {
      setError('Le mot à deviner doit contenir uniquement des lettres (les accents seront automatiquement supprimés).');
      return;
    }
    if (!indiceClean) {
      setError("L'indice est obligatoire.");
      return;
    }

    const newEntry = {
      mot_a_deviner: motNormalized,
      indice: indiceClean
    };

    setListeMots((prev) => {
      if (editingIndex >= 0) {
        const updated = [...prev];
        updated[editingIndex] = newEntry;
        return updated;
      }
      return [...prev, newEntry];
    });

    setDialogOpen(false);
    setMotDialog({ mot_a_deviner: '', indice: '' });
    setError('');
  };

  const handleDeleteMot = (index) => {
    setListeMots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    setError('');

    if (!titre.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    if (!niveau) {
      setError('Le niveau est obligatoire.');
      return;
    }
    if (!theme.trim()) {
      setError('Le thème est obligatoire.');
      return;
    }
    if (!listeMots.length) {
      setError('Ajoutez au moins un mot dans la liste.');
      return;
    }

    const invalidEntry = listeMots.find((entry, idx) => {
      const normalizedMot = normalizeMot(entry.mot_a_deviner);
      if (!normalizedMot || !validateMot(normalizedMot)) {
        setError(`Mot ${idx + 1}: format invalide. Utilisez uniquement des lettres (les accents seront automatiquement supprimés).`);
        return true;
      }
      if (!entry.indice || !entry.indice.trim()) {
        setError(`Mot ${idx + 1}: l'indice est manquant.`);
        return true;
      }
      return false;
    });

    if (invalidEntry) {
      return;
    }

    const data = {
      titre: titre.trim(),
      niveau,
      theme: theme.trim(),
      langue: langue.trim() || 'fr',
      liste_mots: listeMots.map(entry => ({
        mot_a_deviner: normalizeMot(entry.mot_a_deviner),
        indice: entry.indice.trim()
      }))
    };

    onSave(data);
  };

  const handleAiDataChange = (modifiedData) => {
    if (!modifiedData || typeof modifiedData !== 'object') return;
    if (modifiedData.titre) setTitre(modifiedData.titre);
    if (modifiedData.niveau) setNiveau(modifiedData.niveau);
    if (modifiedData.theme) setTheme(modifiedData.theme);
    if (modifiedData.langue) setLangue(modifiedData.langue);
    if (Array.isArray(modifiedData.liste_mots)) {
      setListeMots(modifiedData.liste_mots);
    }
  };

  const getCurrentData = () => ({
    titre: titre.trim(),
    niveau,
    theme: theme.trim(),
    langue: langue.trim() || 'fr',
    liste_mots: listeMots
  });

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a' }}>
      <Box
        sx={{
          flex: showAiChat ? 2 : 1,
          p: 3,
          overflow: 'auto',
          mr: showAiChat ? 1 : 0
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: '#f8fafc' }}>
            Configuration du jeu du Pendu
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PsychologyIcon />}
            endIcon={showAiChat ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowAiChat(!showAiChat)}
            disabled={submitting || aiLoading}
            sx={{
              color: '#38bdf8',
              borderColor: '#38bdf8',
              '&:hover': {
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderColor: '#0ea5e9'
              }
            }}
          >
            {showAiChat ? "Masquer l'IA" : 'Assistant IA'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

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
                  backgroundColor: '#1e293b',
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
                  backgroundColor: '#1e293b',
                  color: '#f8fafc'
                }}
              >
                {niveauxDisponibles.map((niv) => (
                  <MenuItem key={niv} value={niv}>{niv}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label="Thème"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled={submitting}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#1e293b',
                  color: '#f8fafc'
                }
              }}
            />
            <TextField
              fullWidth
              label="Langue (code ISO)"
              value={langue}
              onChange={(e) => setLangue(e.target.value)}
              disabled={submitting}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#1e293b',
                  color: '#f8fafc'
                }
              }}
              helperText="Par défaut : fr"
            />
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.3)', mb: 3 }} />

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#f8fafc' }}>
              Liste des mots ({listeMots.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openAddDialog}
              disabled={submitting}
              sx={{
                backgroundColor: '#38bdf8',
                '&:hover': { backgroundColor: '#0ea5e9' }
              }}
            >
              Ajouter un mot
            </Button>
          </Box>

          {listeMots.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: '#94a3b8', fontStyle: 'italic' }}>
              Aucun mot configuré pour le moment.
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {listeMots.map((entry, index) => (
                <Card key={`${entry.mot_a_deviner}-${index}`} sx={{ backgroundColor: '#1f2937' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#f8fafc', flex: 1 }}>
                        Mot {index + 1} : {entry.mot_a_deviner}
                      </Typography>
                      <Box>
                        <IconButton onClick={() => openEditDialog(index)} sx={{ color: '#60a5fa' }}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteMot(index)} sx={{ color: '#ef4444' }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="body1" sx={{ color: '#cbd5f5' }}>
                      Indice : {entry.indice}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.3)', mt: 4, mb: 3 }} />

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
            sx={{ backgroundColor: '#10b981', '&:hover': { backgroundColor: '#059669' } }}
          >
            Sauvegarder
          </Button>
        </Box>
      </Box>

      {showAiChat && (
        <Box sx={{ flex: 1, ml: 1, borderLeft: 1, borderColor: 'divider', backgroundColor: '#f1f5f9', p: 2 }}>
          <JsonChatBot
            currentData={getCurrentData()}
            resourceType="exercice"
            resourceSubtype="pendu"
            onDataChange={handleAiDataChange}
            disabled={submitting}
            onLoadingChange={setAiLoading}
          />
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIndex >= 0 ? 'Modifier le mot' : 'Ajouter un mot'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Mot à deviner (lettres uniquement, accents automatiquement supprimés)"
            value={motDialog.mot_a_deviner}
            onChange={(e) => setMotDialog((prev) => ({ ...prev, mot_a_deviner: e.target.value }))}
            autoFocus
            helperText="Exemple: héros → HEROS"
          />
          <TextField
            label="Indice"
            multiline
            minRows={2}
            value={motDialog.indice}
            onChange={(e) => setMotDialog((prev) => ({ ...prev, indice: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annuler</Button>
          <Button onClick={handleSaveMot} variant="contained">
            {editingIndex >= 0 ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PenduEditor;
