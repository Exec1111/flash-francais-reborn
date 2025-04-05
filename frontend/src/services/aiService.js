import api from './api'; // Import the configured axios instance

/**
 * Sends a chat message and history to the backend AI endpoint.
 * 
 * @param {string} message - The new message from the user.
 * @param {Array<object>} history - The chat history (array of { role: 'user' | 'assistant', content: string }).
 * @returns {Promise<object>} - A promise that resolves with the AI's response (e.g., { response: '...' }).
 */
const sendChatMessage = async (message, history) => {
  try {
    // The base URL ('/api/v1') is already configured in the api instance
    const response = await api.post('/ai/chat', { message, history });
    return response.data; // The backend returns ChatOutput schema { response: "..." }
  } catch (error) {
    console.error("Error sending chat message:", error.response ? error.response.data : error.message);
    // Re-throw the error or handle it as needed by the UI component
    throw error;
  }
};

export const aiService = {
  sendChatMessage,
};
