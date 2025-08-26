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
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  Person as PersonIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import HtmlChatService from '../../services/htmlChatService';

const HtmlChatBot = ({ 
  currentHtml, 
  onHtmlChange, 
  disabled = false,
  onLoadingChange 
}) => {
  // États principaux
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
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
      const response = await HtmlChatService.processHtmlModification(
        messageText,
        currentHtml,
        newMessages // Envoyer l'historique complet
      );

      // Ajouter la réponse de l'assistant
      const assistantMessage = response.conversation_message;
      setMessages(prev => [...prev, assistantMessage]);

      // Mettre à jour le HTML si modifié
      if (response.modified_html && response.modified_html !== currentHtml) {
        onHtmlChange(response.modified_html);
        setSuccess('HTML modifié avec succès!');
        setTimeout(() => setSuccess(null), 3000);
      }

    } catch (err) {
      console.error('Erreur envoi message:', err);
      setError(err.response?.data?.detail || 'Erreur lors du traitement de votre demande');
      
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
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
        title="Assistant IA pour l'édition HTML"
        subheader={`${messages.length} message(s) dans la conversation`}
        action={
          <Box>
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
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            Commencez une conversation pour modifier votre contenu HTML.
            <br />
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Exemples: "Corrige l'orthographe", "Ajoute une classe CSS", "Change la couleur en bleu"
            </Typography>
          </Typography>
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
                      backgroundColor: message.role === 'user' ? 'primary.light' : 'background.paper',
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
            placeholder="Décrivez les modifications à apporter au HTML..."
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

export default HtmlChatBot;