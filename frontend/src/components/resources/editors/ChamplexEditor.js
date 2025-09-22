import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Psychology as PsychologyIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import JsonChatBot from '../../jsonChat/JsonChatBot';

/**
 * Éditeur structuré pour les exercices Champlex (JSON-first)
 * data_json attendu: { champs: [ { name: string, words: string[] }, ... ] }
 */
const ChamplexEditor = ({ initialData, onSave, onCancel, submitting = false }) => {
  const [champs, setChamps] = useState([]);
  const [error, setError] = useState('');

  // État pour le chat IA
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Dialog état
  const [openDialog, setOpenDialog] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [champName, setChampName] = useState('');
  const [champWords, setChampWords] = useState(''); // zone multi-ligne, un mot par ligne

  useEffect(() => {
    const dj = initialData?.data_json || {};
    const arr = Array.isArray(dj.champs) ? dj.champs : [];
    const safe = arr.map((c, i) => ({ name: String(c?.name || '').trim(), words: Array.isArray(c?.words) ? c.words.map(w => String(w)) : [], id: `champ-${i}-${Date.now()}` }));
    setChamps(safe);
  }, [initialData]);

  const resetDialog = () => {
    setCurrentIndex(-1);
    setChampName('');
    setChampWords('');
  };

  const handleOpenAdd = () => {
    resetDialog();
    setOpenDialog(true);
  };

  const handleOpenEdit = (index) => {
    const c = champs[index];
    setCurrentIndex(index);
    setChampName(c.name);
    setChampWords((c.words || []).join('\n'));
    setOpenDialog(true);
  };

  const handleDelete = (index) => {
    setChamps(champs.filter((_, i) => i !== index));
  };

  const handleDialogSave = () => {
    const name = (champName || '').trim();
    const words = (champWords || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!name) { setError('Le nom du champ lexical est obligatoire'); return; }
    if (words.length === 0) { setError('Ajoutez au moins un mot pour ce champ lexical'); return; }

    const newChamp = { name, words };
    if (currentIndex >= 0) {
      const updated = [...champs];
      updated[currentIndex] = { ...newChamp, id: champs[currentIndex].id };
      setChamps(updated);
    } else {
      setChamps([...champs, { ...newChamp, id: `champ-${Date.now()}` }]);
    }
    setOpenDialog(false);
  };

  const handleSaveAll = () => {
    setError('');
    if (!Array.isArray(champs) || champs.length === 0) {
      setError('Ajoutez au moins un champ lexical');
      return;
    }
    // Valider que chaque champ a au moins un mot
    for (const c of champs) {
      if (!c.name || !Array.isArray(c.words) || c.words.length === 0) {
        setError('Chaque champ doit avoir un nom et au moins un mot');
        return;
      }
    }
    const data = { champs: champs.map(c => ({ name: c.name, words: c.words })) };
    onSave?.(data);
  };

  // Gestionnaire pour les modifications via IA
  const handleAiDataChange = (modifiedData) => {
    if (Array.isArray(modifiedData.champs)) {
      const newChamps = modifiedData.champs.map((c, i) => ({
        name: c.name || '',
        words: Array.isArray(c.words) ? c.words : [],
        id: `champ-${i}-${Date.now()}`
      }));
      setChamps(newChamps);
    }
  };

  // Données actuelles pour le chat IA
  const getCurrentData = () => ({
    champs: champs.map(c => ({ name: c.name, words: c.words }))
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
          <Typography variant="h4" sx={{ color: '#f8fafc' }}>Configuration de l'activité Champlex</Typography>
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
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#f8fafc' }}>Champs lexicaux ({champs.length})</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} disabled={submitting} sx={{ backgroundColor: '#3b82f6', '&:hover': { backgroundColor: '#2563eb' } }}>Ajouter un champ</Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2 }}>
        {champs.length === 0 ? (
          <Box sx={{ gridColumn: '1 / -1', color: '#94a3b8', fontStyle: 'italic' }}>Aucun champ configuré pour le moment.</Box>
        ) : champs.map((c, idx) => (
          <Box key={c.id} sx={{ p: 2, backgroundColor: '#334155', borderRadius: 2, border: '1px solid #475569' }}>
            <Typography variant="subtitle1" sx={{ color: '#f8fafc', mb: 1 }}>{c.name}</Typography>
            <Typography variant="body2" sx={{ color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{(c.words || []).join(', ')}</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <IconButton size="small" onClick={() => handleOpenEdit(idx)} disabled={submitting} sx={{ color: '#94a3b8' }}><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={() => handleDelete(idx)} disabled={submitting} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button variant="outlined" onClick={onCancel} disabled={submitting} sx={{ borderColor: '#64748b', color: '#e2e8f0' }}>Annuler</Button>
        <Button variant="contained" onClick={handleSaveAll} disabled={submitting} sx={{ backgroundColor: '#059669', '&:hover': { backgroundColor: '#047857' } }}>{submitting ? 'Sauvegarde...' : 'Sauvegarder'}</Button>
      </Box>

      <Dialog open={openDialog} onClose={() => !submitting && setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: '#334155', color: '#f8fafc' } }}>
        <DialogTitle>Configurer le champ</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Nom du champ lexical" variant="outlined" value={champName} onChange={(e) => setChampName(e.target.value)} disabled={submitting} sx={{ mb: 2, '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
          <TextField fullWidth multiline minRows={6} label="Mots (un par ligne)" variant="outlined" value={champWords} onChange={(e) => setChampWords(e.target.value)} disabled={submitting} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={submitting} sx={{ color: '#94a3b8' }}>Annuler</Button>
          <Button onClick={handleDialogSave} variant="contained" disabled={submitting} sx={{ backgroundColor: '#3b82f6' }}>Enregistrer</Button>
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
            resourceSubtype="champlex"
            onDataChange={handleAiDataChange}
            disabled={submitting}
            onLoadingChange={setAiLoading}
          />
        </Box>
      )}
    </Box>
  );
};

export default ChamplexEditor;
