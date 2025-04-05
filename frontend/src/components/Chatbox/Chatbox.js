import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, 
    TextField, 
    Button, 
    List, 
    ListItem, 
    ListItemText, 
    Paper, 
    Typography, 
    CircularProgress,
    IconButton 
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close'; 
import { aiService } from '../../services/aiService'; 

const Chatbox = ({ onClose }) => {
    const [messages, setMessages] = useState([]); 
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null); 

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]); 

    const handleSendMessage = async () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || isLoading) return;

        const newUserMessage = { role: 'user', content: trimmedInput };
        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);

        const historyForAPI = messages.filter(m => m.role === 'user' || m.role === 'assistant');

        try {
            const response = await aiService.sendChatMessage(trimmedInput, historyForAPI);
            const aiMessage = { role: 'assistant', content: response.response }; 
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Chat API error:", error);
            const errorDetail = error.response?.data?.detail || 'Impossible de contacter l\'assistant IA.';
            const errorMessage = { role: 'error', content: `Erreur: ${errorDetail}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); 
            handleSendMessage();
        }
    };

    return (
        <Paper elevation={3} sx={{ 
            height: '100%', 
            width: '100%',  
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden' 
        }}>
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                p: 1, 
                borderBottom: '1px solid', 
                borderColor: 'divider' 
            }}>
                <Typography variant="h6" component="div" sx={{ ml: 1 }}> 
                    Assistant IA
                </Typography>
                {onClose && ( 
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                )}
            </Box>
            <Box sx={{ 
                flexGrow: 1, 
                overflowY: 'auto', 
                p: 2 
            }}>
                <List>
                    {messages.map((msg, index) => (
                        <ListItem 
                            key={index} 
                            sx={{ 
                                display: 'flex',
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                mb: 1, 
                            }}
                        >
                            <Paper 
                                elevation={1} 
                                sx={{
                                    p: 1.2, 
                                    maxWidth: '80%', 
                                    bgcolor: msg.role === 'user' ? 'primary.light' : 
                                             msg.role === 'assistant' ? 'grey.200' : 
                                             'error.light', 
                                    color: msg.role === 'user' ? 'primary.contrastText' : 
                                           msg.role === 'error' ? 'error.contrastText' : 
                                           'text.primary', 
                                    borderRadius: msg.role === 'user' ? '15px 15px 5px 15px' : '15px 15px 15px 5px', 
                                    wordBreak: 'break-word', 
                                }}
                            >
                                <ListItemText 
                                    primary={msg.content} 
                                    primaryTypographyProps={{ 
                                        style: { whiteSpace: 'pre-wrap' },
                                        fontSize: '0.9rem' 
                                    }} 
                                />
                            </Paper>
                        </ListItem>
                    ))}
                    {isLoading && (
                        <ListItem sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                             <CircularProgress size={20} sx={{ ml: 1 }} />
                        </ListItem>
                    )}
                    <div ref={messagesEndRef} /> 
                </List>
            </Box>
            <Box sx={{ 
                p: 1.5, 
                borderTop: '1px solid', 
                borderColor: 'divider', 
                display: 'flex', 
                alignItems: 'center',
                bgcolor: 'background.paper' 
            }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small" 
                    placeholder="Posez votre question..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    multiline
                    maxRows={3} 
                    sx={{ mr: 1 }}
                />
                <IconButton color="primary" onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()} size="medium">
                    {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
                </IconButton>
            </Box>
        </Paper>
    );
};

export default Chatbox;
