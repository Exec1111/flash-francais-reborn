import api from './api';

const JsonChatService = {
  /**
   * Traiter une demande de modification JSON avec historique éphémère
   */
  async processJsonModification(message, currentData, resourceType, resourceSubtype, conversationHistory = [], modelConfig = null) {
    const requestData = {
      message,
      current_data: currentData,
      resource_type: resourceType,
      resource_subtype: resourceSubtype,
      conversation_history: conversationHistory
    };

    // Ajouter la configuration du modèle si fournie
    if (modelConfig) {
      requestData.ai_model_config = modelConfig;
    }

    console.log('[DEBUG] JsonChatService - Données envoyées:', {
      ...requestData,
      current_data: typeof requestData.current_data === 'object' ? JSON.stringify(requestData.current_data).substring(0, 100) + '...' : requestData.current_data
    });

    try {
      const response = await api.post('/json-chat/process', requestData);
      console.log('[DEBUG] JsonChatService - Réponse reçue:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] JsonChatService - Erreur:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default JsonChatService;
