import api from './api';

const HtmlChatService = {
  /**
   * Traiter une demande de modification HTML avec historique éphémère
   */
  async processHtmlModification(message, currentHtml, conversationHistory = []) {
    const response = await api.post('/html-chat/process', {
      message,
      current_html: currentHtml,
      conversation_history: conversationHistory
    });
    return response.data;
  }
};

export default HtmlChatService;