import api from './api';

const HtmlChatService = {
  /**
   * Traiter une demande de modification HTML avec historique éphémère
   */
  async processHtmlModification(message, currentHtml, conversationHistory = [], modelConfig = null) {
    const requestData = {
      message,
      current_html: currentHtml,
      conversation_history: conversationHistory
    };

    // Ajouter la configuration du modèle si fournie
    if (modelConfig) {
      requestData.ai_model_config = modelConfig;
    }

    const response = await api.post('/html-chat/process', requestData);
    return response.data;
  }
};

export default HtmlChatService;