import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
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
 * Éditeur structuré pour les exercices Champlex2
 * Interface graphique avec boutons et drag & drop
 */
const Champlex2Editor = ({ 
  initialData, 
  onSave, 
  onCancel, 
  submitting = false 
}) => {
  // État local des données
  const [champ, setChamp] = useState('');
  const [mots, setMots] = useState([]);
  const [error, setError] = useState('');
  
  // État pour l'ajout/édition de mots
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [newMot, setNewMot] = useState('');
  const [newMotInChamp, setNewMotInChamp] = useState(true);

  // État pour le chat IA
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Initialiser avec les données existantes
  useEffect(() => {
    if (initialData?.data_json) {
      const data = initialData.data_json;
      setChamp(data.champ || '');
      
      // Reconstruire la liste des mots avec leur statut
      const motsList = (data.mots || []).map((mot, i) => ({
        text: mot,
        inChamp: data.solution?.[i] || false,
        id: `mot-${i}-${Date.now()}`
      }));
      setMots(motsList);
    }
  }, [initialData]);

  // Ajouter un nouveau mot
  const handleAddMot = () => {
    if (!newMot.trim()) return;
    
    const newMotObj = {
      text: newMot.trim(),
      inChamp: newMotInChamp,
      id: `mot-${Date.now()}-${Math.random()}`
    };
    
    if (editingIndex >= 0) {
      // Édition d'un mot existant
      const updatedMots = [...mots];
      updatedMots[editingIndex] = newMotObj;
      setMots(updatedMots);
      setEditingIndex(-1);
    } else {
      // Ajout d'un nouveau mot
      setMots([...mots, newMotObj]);
    }
    
    setNewMot('');
    setNewMotInChamp(true);
    setShowAddDialog(false);
  };

  // Supprimer un mot
  const handleDeleteMot = (index) => {
    setMots(mots.filter((_, i) => i !== index));
  };

  // Éditer un mot
  const handleEditMot = (index) => {
    const mot = mots[index];
    setNewMot(mot.text);
    setNewMotInChamp(mot.inChamp);
    setEditingIndex(index);
    setShowAddDialog(true);
  };

  // Basculer le statut d'un mot (dans/hors champ)
  const handleToggleMot = (index) => {
    const updatedMots = [...mots];
    updatedMots[index].inChamp = !updatedMots[index].inChamp;
    setMots(updatedMots);
  };

  // Sauvegarder les données
  const handleSave = () => {
    setError('');
    
    // Validation
    if (!champ.trim()) {
      setError('Le champ lexical est obligatoire');
      return;
    }
    
    if (mots.length === 0) {
      setError('Au moins un mot est requis');
      return;
    }

    // Construire le JSON final
    const data = {
      champ: champ.trim(),
      mots: mots.map(m => m.text),
      solution: mots.map(m => m.inChamp)
    };

    onSave(data);
  };

  // Gestionnaire pour les modifications via IA
  const handleAiDataChange = (modifiedData) => {
    if (modifiedData.champ) setChamp(modifiedData.champ);
    if (Array.isArray(modifiedData.mots) && Array.isArray(modifiedData.solution)) {
      const motsList = modifiedData.mots.map((mot, i) => ({
        text: mot,
        inChamp: modifiedData.solution[i] || false,
        id: `mot-${i}-${Date.now()}`
      }));
      setMots(motsList);
    }
  };

  // Données actuelles pour le chat IA
  const getCurrentData = () => ({
    champ: champ.trim(),
    mots: mots.map(m => m.text),
    solution: mots.map(m => m.inChamp)
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
            Configuration de l'activité Champlex2
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

      {/* Champ lexical */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#f8fafc' }}>
          Champ lexical
        </Typography>
        <TextField
          fullWidth
          value={champ}
          onChange={(e) => setChamp(e.target.value)}
          placeholder="Ex: la peur, la joie, la nature..."
          variant="outlined"
          disabled={submitting}
          sx={{ 
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#334155',
              color: '#f8fafc',
              '& fieldset': {
                borderColor: '#475569'
              },
              '&:hover fieldset': {
                borderColor: '#64748b'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#3b82f6'
              }
            },
            '& .MuiInputBase-input::placeholder': {
              color: '#94a3b8',
              opacity: 1
            }
          }}
        />
      </Box>

      {/* Liste des mots */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#f8fafc' }}>
            Mots configurés ({mots.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
            disabled={submitting}
            sx={{ 
              backgroundColor: '#3b82f6',
              '&:hover': {
                backgroundColor: '#2563eb'
              }
            }}
          >
            Ajouter un mot
          </Button>
        </Box>

        {/* Grille des mots */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: 2,
          minHeight: 200,
          p: 2,
          border: '2px dashed #475569',
          borderRadius: 2,
          backgroundColor: '#334155'
        }}>
          {mots.length === 0 ? (
            <Box sx={{ 
              gridColumn: '1 / -1',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#94a3b8',
              fontStyle: 'italic'
            }}>
              Aucun mot configuré. Cliquez sur "Ajouter un mot" pour commencer.
            </Box>
          ) : (
            mots.map((mot, index) => (
              <Box
                key={mot.id}
                sx={{
                  p: 2,
                  backgroundColor: '#475569',
                  border: '1px solid #64748b',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  '&:hover': {
                    backgroundColor: '#52525b',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.4)'
                  }
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 1, color: '#f8fafc' }}>
                    {mot.text}
                  </Typography>
                  <Chip
                    label={mot.inChamp ? 'Dans le champ' : 'Hors champ'}
                    size="small"
                    onClick={() => handleToggleMot(index)}
                    sx={{
                      backgroundColor: mot.inChamp ? '#065f46' : '#7f1d1d',
                      color: mot.inChamp ? '#10b981' : '#ef4444',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: mot.inChamp ? '#047857' : '#991b1b'
                      }
                    }}
                  />
                </Box>
                <Box sx={{ ml: 2 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleEditMot(index)}
                    disabled={submitting}
                    sx={{ 
                      mr: 1,
                      color: '#94a3b8',
                      '&:hover': {
                        backgroundColor: 'rgba(148, 163, 184, 0.1)',
                        color: '#f8fafc'
                      }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteMot(index)}
                    disabled={submitting}
                    sx={{
                      color: '#ef4444',
                      '&:hover': {
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#fca5a5'
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* Statistiques */}
      <Box sx={{ mb: 4, p: 2, backgroundColor: '#334155', borderRadius: 2, border: '1px solid #475569' }}>
        <Typography variant="body2" sx={{ color: '#f8fafc', mb: 1 }}>
          <strong>Statistiques :</strong>
        </Typography>
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
            Total : <strong>{mots.length} mots</strong>
          </Typography>
          <Typography variant="body2" sx={{ color: '#10b981' }}>
            Dans le champ : <strong>{mots.filter(m => m.inChamp).length}</strong>
          </Typography>
          <Typography variant="body2" sx={{ color: '#ef4444' }}>
            Hors champ : <strong>{mots.filter(m => !m.inChamp).length}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Boutons d'action */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={submitting}
          size="large"
          sx={{
            borderColor: '#64748b',
            color: '#e2e8f0',
            '&:hover': {
              borderColor: '#94a3b8',
              backgroundColor: 'rgba(148, 163, 184, 0.1)'
            }
          }}
        >
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={submitting}
          size="large"
          sx={{ 
            backgroundColor: '#059669',
            '&:hover': {
              backgroundColor: '#047857'
            }
          }}
        >
          {submitting ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </Box>

      {/* Dialog d'ajout/édition de mot */}
      <Dialog
        open={showAddDialog}
        onClose={() => !submitting && setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#334155',
            color: '#f8fafc'
          }
        }}
      >
        <DialogTitle sx={{ color: '#f8fafc' }}>
          {editingIndex >= 0 ? 'Modifier le mot' : 'Ajouter un mot'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Mot"
            fullWidth
            variant="outlined"
            value={newMot}
            onChange={(e) => setNewMot(e.target.value)}
            disabled={submitting}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#475569',
                color: '#f8fafc',
                '& fieldset': {
                  borderColor: '#64748b'
                },
                '&:hover fieldset': {
                  borderColor: '#94a3b8'
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3b82f6'
                }
              },
              '& .MuiInputLabel-root': {
                color: '#94a3b8'
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#3b82f6'
              }
            }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={newMotInChamp ? 'contained' : 'outlined'}
              onClick={() => setNewMotInChamp(true)}
              disabled={submitting}
              startIcon={newMotInChamp ? <CheckIcon /> : null}
              sx={{ 
                backgroundColor: newMotInChamp ? '#059669' : 'transparent',
                color: newMotInChamp ? '#fff' : '#10b981',
                borderColor: '#10b981',
                '&:hover': {
                  backgroundColor: newMotInChamp ? '#047857' : 'rgba(16, 185, 129, 0.1)',
                  borderColor: '#059669'
                }
              }}
            >
              Dans le champ
            </Button>
            <Button
              variant={!newMotInChamp ? 'contained' : 'outlined'}
              onClick={() => setNewMotInChamp(false)}
              disabled={submitting}
              startIcon={!newMotInChamp ? <CheckIcon /> : null}
              sx={{ 
                backgroundColor: !newMotInChamp ? '#dc2626' : 'transparent',
                color: !newMotInChamp ? '#fff' : '#ef4444',
                borderColor: '#ef4444',
                '&:hover': {
                  backgroundColor: !newMotInChamp ? '#b91c1c' : 'rgba(239, 68, 68, 0.1)',
                  borderColor: '#dc2626'
                }
              }}
            >
              Hors champ
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowAddDialog(false)}
            disabled={submitting}
            sx={{
              color: '#94a3b8',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.1)'
              }
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleAddMot}
            variant="contained"
            disabled={!newMot.trim() || submitting}
            sx={{
              backgroundColor: '#3b82f6',
              '&:hover': {
                backgroundColor: '#2563eb'
              }
            }}
          >
            {editingIndex >= 0 ? 'Modifier' : 'Ajouter'}
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
            resourceSubtype="champlex2"
            onDataChange={handleAiDataChange}
            disabled={submitting}
            onLoadingChange={setAiLoading}
          />
        </Box>
      )}
    </Box>
  );
};

export default Champlex2Editor;
