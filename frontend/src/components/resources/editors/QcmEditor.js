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
  Radio,
  RadioGroup,
  FormControlLabel,
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
 * Éditeur structuré pour les exercices QCM
 * Interface graphique avec gestion des questions et options
 */
const QcmEditor = ({ 
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
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  
  // État pour le chat IA
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // États pour l'édition de questions
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);
  const [questionText, setQuestionText] = useState('');
  const [questionExplication, setQuestionExplication] = useState('');
  const [questionOptions, setQuestionOptions] = useState([]);
  const [correctAnswerId, setCorrectAnswerId] = useState('');

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
      setQuestions(data.questions || []);
    }
  }, [initialData]);

  // Gestionnaires pour les questions
  const handleAddQuestion = () => {
    setEditingQuestionIndex(-1);
    setQuestionText('');
    setQuestionExplication('');
    setQuestionOptions([
      { id: 'a', texte: '' },
      { id: 'b', texte: '' },
      { id: 'c', texte: '' },
      { id: 'd', texte: '' }
    ]);
    setCorrectAnswerId('a');
    setShowQuestionDialog(true);
  };

  const handleEditQuestion = (index) => {
    const question = questions[index];
    setEditingQuestionIndex(index);
    setQuestionText(question.texte);
    setQuestionExplication(question.explication || '');
    setQuestionOptions([...question.options]);
    setCorrectAnswerId(question.reponse_correcte);
    setShowQuestionDialog(true);
  };

  const handleDeleteQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const handleSaveQuestion = () => {
    if (!questionText.trim()) {
      setError('Le texte de la question est obligatoire');
      return;
    }

    const validOptions = questionOptions.filter(opt => opt.texte.trim());
    if (validOptions.length < 2) {
      setError('Au moins 2 options sont requises');
      return;
    }

    if (!correctAnswerId || !validOptions.find(opt => opt.id === correctAnswerId)) {
      setError('Une réponse correcte doit être sélectionnée');
      return;
    }

    const newQuestion = {
      id: editingQuestionIndex >= 0 ? questions[editingQuestionIndex].id : Date.now().toString(),
      texte: questionText.trim(),
      reponse_correcte: correctAnswerId,
      explication: questionExplication.trim(),
      options: validOptions
    };

    let newQuestions;
    if (editingQuestionIndex >= 0) {
      newQuestions = [...questions];
      newQuestions[editingQuestionIndex] = newQuestion;
    } else {
      newQuestions = [...questions, newQuestion];
    }

    setQuestions(newQuestions);
    setShowQuestionDialog(false);
    setError('');
  };

  const handleOptionChange = (optionId, value) => {
    const newOptions = questionOptions.map(opt => 
      opt.id === optionId ? { ...opt, texte: value } : opt
    );
    setQuestionOptions(newOptions);
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
    if (questions.length === 0) {
      setError('Au moins une question est requise');
      return;
    }

    // Construire le JSON final
    const data = {
      titre: titre.trim(),
      description: description.trim(),
      niveau,
      theme: theme.trim(),
      questions
    };

    onSave(data);
  };

  // Gestionnaire pour les modifications via IA
  const handleAiDataChange = (modifiedData) => {
    if (modifiedData.titre) setTitre(modifiedData.titre);
    if (modifiedData.description) setDescription(modifiedData.description);
    if (modifiedData.niveau) setNiveau(modifiedData.niveau);
    if (modifiedData.theme) setTheme(modifiedData.theme);
    if (Array.isArray(modifiedData.questions)) {
      setQuestions(modifiedData.questions);
    }
  };

  // Données actuelles pour le chat IA
  const getCurrentData = () => ({
    titre: titre.trim(),
    description: description.trim(),
    niveau,
    theme: theme.trim(),
    questions
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
            Configuration de l'activité QCM
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
              label="Titre du QCM"
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

        {/* Questions */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#f8fafc' }}>
              Questions ({questions.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddQuestion}
              disabled={submitting}
              sx={{
                backgroundColor: '#3b82f6',
                '&:hover': { backgroundColor: '#2563eb' }
              }}
            >
              Ajouter une question
            </Button>
          </Box>

          {questions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: '#94a3b8', fontStyle: 'italic' }}>
              Aucune question configurée pour le moment.
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {questions.map((question, index) => (
                <Card key={question.id} sx={{ backgroundColor: '#374151' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#f8fafc', flex: 1 }}>
                        Question {index + 1}: {question.texte}
                      </Typography>
                      <Box>
                        <IconButton onClick={() => handleEditQuestion(index)} sx={{ color: '#60a5fa' }}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteQuestion(index)} sx={{ color: '#ef4444' }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Box sx={{ ml: 2 }}>
                      {question.options.map((option) => (
                        <Box key={option.id} sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mb: 1,
                          color: option.id === question.reponse_correcte ? '#22c55e' : '#d1d5db'
                        }}>
                          <Typography variant="body2" sx={{ fontWeight: option.id === question.reponse_correcte ? 600 : 400 }}>
                            {option.id.toUpperCase()}) {option.texte}
                            {option.id === question.reponse_correcte && ' ✓'}
                          </Typography>
                        </Box>
                      ))}
                      {question.explication && (
                        <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', mt: 1 }}>
                          Explication: {question.explication}
                        </Typography>
                      )}
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

        {/* Dialog d'édition de question */}
        <Dialog
          open={showQuestionDialog}
          onClose={() => setShowQuestionDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { backgroundColor: '#1e293b', color: '#f8fafc' }
          }}
        >
          <DialogTitle>
            {editingQuestionIndex >= 0 ? 'Modifier la question' : 'Ajouter une question'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Texte de la question"
              multiline
              rows={2}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#475569',
                  color: '#f8fafc'
                }
              }}
            />

            <Typography variant="h6" sx={{ mb: 2 }}>Options de réponse</Typography>
            
            <RadioGroup
              value={correctAnswerId}
              onChange={(e) => setCorrectAnswerId(e.target.value)}
            >
              {questionOptions.map((option) => (
                <Box key={option.id} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FormControlLabel
                    value={option.id}
                    control={<Radio sx={{ color: '#3b82f6' }} />}
                    label={`${option.id.toUpperCase()})`}
                    sx={{ minWidth: 60 }}
                  />
                  <TextField
                    fullWidth
                    placeholder={`Option ${option.id.toUpperCase()}`}
                    value={option.texte}
                    onChange={(e) => handleOptionChange(option.id, e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#475569',
                        color: '#f8fafc'
                      }
                    }}
                  />
                </Box>
              ))}
            </RadioGroup>

            <TextField
              fullWidth
              label="Explication (optionnel)"
              multiline
              rows={2}
              value={questionExplication}
              onChange={(e) => setQuestionExplication(e.target.value)}
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#475569',
                  color: '#f8fafc'
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowQuestionDialog(false)} sx={{ color: '#94a3b8' }}>
              Annuler
            </Button>
            <Button onClick={handleSaveQuestion} variant="contained" sx={{ backgroundColor: '#3b82f6' }}>
              {editingQuestionIndex >= 0 ? 'Modifier' : 'Ajouter'}
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
            resourceSubtype="qcm"
            onDataChange={handleAiDataChange}
            disabled={submitting}
            onLoadingChange={setAiLoading}
          />
        </Box>
      )}
    </Box>
  );
};

export default QcmEditor;
