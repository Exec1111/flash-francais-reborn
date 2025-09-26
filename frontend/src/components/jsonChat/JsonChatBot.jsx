import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  Avatar,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Grid
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  Person as PersonIcon,
  Clear as ClearIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import JsonChatService from '../../services/jsonChatService';

const JsonChatBot = ({ 
  currentData, 
  resourceType,
  resourceSubtype,
  onDataChange, 
  disabled = false,
  onLoadingChange 
}) => {
  // États principaux
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // États pour la sélection de modèle IA
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('google');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  
  // Modèles disponibles par fournisseur
  const availableModels = {
    openai: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-5-mini', label: 'GPT-5 Mini' }
    ],
    google: [
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' }
    ]
  };
  
  // Références
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll vers le bas des messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading || disabled) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setLoading(true);
    if (onLoadingChange) onLoadingChange(true); // Notifier le parent
    setError(null);

    // Ajouter le message utilisateur à l'historique local
    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      // Validation des données avant envoi
      if (!currentData || typeof currentData !== 'object') {
        throw new Error('Données actuelles invalides');
      }
      
      if (!resourceType || !resourceSubtype) {
        throw new Error('Type ou sous-type de ressource manquant');
      }
      
      console.log('[DEBUG] Envoi requête JSON chat:', {
        message: messageText,
        currentData,
        resourceType,
        resourceSubtype,
        historyLength: newMessages.length,
        modelConfig: { provider: selectedProvider, model: selectedModel }
      });
      
      const response = await JsonChatService.processJsonModification(
        messageText,
        currentData,
        resourceType,
        resourceSubtype,
        newMessages, // Envoyer l'historique complet
        {
          provider: selectedProvider,
          model: selectedModel
        }
      );

      // Ajouter la réponse de l'assistant
      const assistantMessage = response.conversation_message;
      setMessages(prev => [...prev, assistantMessage]);

      // Mettre à jour les données si modifiées
      if (response.modified_data && JSON.stringify(response.modified_data) !== JSON.stringify(currentData)) {
        onDataChange(response.modified_data);
        setSuccess('Données modifiées avec succès!');
        setTimeout(() => setSuccess(null), 3000);
      }

    } catch (err) {
      console.error('Erreur envoi message:', err);
      
      // Gestion robuste des erreurs API
      let errorMessage = 'Erreur lors du traitement de votre demande';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Si c'est un détail simple (string)
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
        // Si c'est une erreur de validation Pydantic (array d'objets)
        else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(e => {
            if (typeof e === 'string') return e;
            if (e.msg) return `${e.loc?.join?.('.') || 'Champ'}: ${e.msg}`;
            return JSON.stringify(e);
          }).join('; ');
        }
        // Fallback pour autres structures
        else if (errorData.detail) {
          errorMessage = String(errorData.detail);
        }
      }
      
      setError(errorMessage);
      
      // Retirer le message utilisateur en cas d'erreur
      setMessages(messages);
      
    } finally {
      setLoading(false);
      if (onLoadingChange) onLoadingChange(false); // Notifier le parent
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setError(null);
    setSuccess(null);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Messages d'exemple selon le type de ressource
  const getExampleMessages = () => {
    const examples = {
      champlex: [
        "Ajoute un champ lexical 'la nature' avec les mots: arbre, fleur, montagne",
        "Supprime le champ lexical 'la peur'",
        "Ajoute 3 mots au champ lexical 'l'amour'"
      ],
      champlex2: [
        "Change le champ lexical pour 'la cuisine'",
        "Ajoute 5 nouveaux mots dont 3 dans le champ et 2 hors champ",
        "Inverse la solution du mot 'passion'"
      ],
      qcm: [
        "Ajoute une nouvelle question sur les accords du participe passé",
        "Modifie la question 2 pour la rendre plus difficile",
        "Ajoute une explication à la première question",
        "Change le thème pour 'La poésie romantique'",
        "Crée 2 nouvelles questions sur les figures de style"
      ],
      pendu: [
        "Ajoute 2 nouveaux mots sur le thème des animaux",
        "Change le thème pour 'les métiers'",
        "Améliore l'indice du mot 'courage'",
        "Supprime le mot le plus facile",
        "Ajoute un mot plus difficile pour les 4ème"
      ]
    };
    return examples[resourceSubtype] || [
      "Modifie les données selon mes besoins",
      "Ajoute du contenu",
      "Corrige les erreurs"
    ];
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Overlay de chargement pour bloquer les interactions */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            borderRadius: 1
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              L'IA traite votre demande...
            </Typography>
          </Box>
        </Box>
      )}
      
      <Card sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        avatar={<PsychologyIcon color="primary" />}
        title={`Assistant IA pour ${resourceSubtype}`}
        subheader={`${messages.length} message(s) dans la conversation`}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={() => setShowModelSelector(!showModelSelector)}
              title="Paramètres du modèle IA"
              color={showModelSelector ? 'primary' : 'default'}
            >
              <SettingsIcon />
            </IconButton>
            <IconButton 
              onClick={clearConversation} 
              disabled={messages.length === 0}
              title="Vider la conversation"
            >
              <ClearIcon />
            </IconButton>
          </Box>
        }
      />

      {/* Sélecteur de modèle IA */}
      <Collapse in={showModelSelector}>
        <Box sx={{ 
          p: 3, 
          backgroundColor: 'primary.main', 
          color: 'primary.contrastText',
          borderBottom: '1px solid', 
          borderColor: 'primary.dark' 
        }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            🤖 Configuration du modèle IA
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'primary.contrastText', '&.Mui-focused': { color: 'primary.contrastText' } }}>
                  Fournisseur
                </InputLabel>
                <Select
                  value={selectedProvider}
                  label="Fournisseur"
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    // Réinitialiser le modèle au premier disponible pour le nouveau fournisseur
                    setSelectedModel(availableModels[e.target.value][0].value);
                  }}
                  sx={{
                    color: 'primary.contrastText',
                    '.MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.contrastText',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.contrastText',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.contrastText',
                    },
                    '.MuiSvgIcon-root': {
                      color: 'primary.contrastText',
                    },
                  }}
                >
                  <MenuItem value="google">🔍 Google</MenuItem>
                  <MenuItem value="openai">🧠 OpenAI</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'primary.contrastText', '&.Mui-focused': { color: 'primary.contrastText' } }}>
                  Modèle
                </InputLabel>
                <Select
                  value={selectedModel}
                  label="Modèle"
                  onChange={(e) => setSelectedModel(e.target.value)}
                  sx={{
                    color: 'primary.contrastText',
                    '.MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.contrastText',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.contrastText',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.contrastText',
                    },
                    '.MuiSvgIcon-root': {
                      color: 'primary.contrastText',
                    },
                  }}
                >
                  {availableModels[selectedProvider].map((model) => (
                    <MenuItem key={model.value} value={model.value}>
                      {model.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              ✨ Modèle sélectionné:
            </Typography>
            <Typography variant="body2" sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              px: 1.5, 
              py: 0.5, 
              borderRadius: 0.5,
              fontWeight: 600
            }}>
              {availableModels[selectedProvider].find(m => m.value === selectedModel)?.label}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              ({selectedProvider === 'google' ? '🔍 Google' : '🧠 OpenAI'})
            </Typography>
          </Box>
        </Box>
      </Collapse>

      {/* Alertes */}
      {error && (
        <Alert severity="error" sx={{ m: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ m: 1 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Zone des messages */}
      <CardContent sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {messages.length === 0 ? (
          <Box>
            <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
              Commencez une conversation pour modifier vos données {resourceSubtype}.
            </Typography>
            <Typography variant="caption" display="block" align="center" sx={{ mt: 2, mb: 2 }}>
              Exemples de demandes:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
              {getExampleMessages().map((example, index) => (
                <Paper 
                  key={index}
                  sx={{ 
                    p: 1.5, 
                    backgroundColor: 'grey.50', 
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'grey.200',
                    '&:hover': { 
                      backgroundColor: 'grey.100',
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => setInputMessage(example)}
                >
                  <Typography variant="body2" sx={{ color: 'grey.700', fontWeight: 500 }}>
                    "{example}"
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {messages.map((message, index) => (
              <ListItem key={index} sx={{ alignItems: 'flex-start', px: 1 }}>
                <Avatar sx={{ mr: 1, mt: 0.5 }}>
                  {message.role === 'user' ? <PersonIcon /> : <PsychologyIcon />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      backgroundColor: message.role === 'user' ? 'primary.light' : '#ffffff',
                      color: message.role === 'user' ? 'primary.contrastText' : '#000000',
                      border: message.role === 'assistant' ? '1px solid' : 'none',
                      borderColor: message.role === 'assistant' ? 'grey.300' : 'transparent'
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Typography>
                  </Paper>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {formatTimestamp(message.timestamp)}
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <Divider />

      {/* Zone de saisie */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={3}
            placeholder={`Décrivez les modifications à apporter aux données ${resourceSubtype}...`}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || disabled}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={!inputMessage.trim() || loading || disabled}
            sx={{ minWidth: 48 }}
          >
            {loading ? <CircularProgress size={20} /> : <SendIcon />}
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
        </Typography>
      </Box>
    </Card>
    </Box>
  );
};

export default JsonChatBot;
