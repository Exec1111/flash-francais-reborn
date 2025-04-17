// Service pour la fusion IA (Gemini) d'un contenu édité avec un modèle HTML
import api from './api';

/**
 * Fusionne un contenu JSON édité avec un modèle HTML côté backend.
 * ATTENTION : Les données doivent être envoyées en FormData (multipart/form-data) !
 * @param {Object} params - { typeKey, subtypeKey, dataJson, modelPath, userId }
 * @returns {Promise<{ html_url: string, html_path: string }>}
 */
const mergeResource = async ({ typeKey, subtypeKey, dataJson, modelPath, userId }) => {
  const token = localStorage.getItem('token');
  const form = new FormData();
  form.append('type_key', typeKey);
  form.append('subtype_key', subtypeKey);
  form.append('data_json', dataJson);
  form.append('model_path', modelPath);
  form.append('user_id', userId);
  const res = await api.post(
    '/ai/merge-resource',
    form,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return res.data; // { html_url, html_path }
};

export default { mergeResource };
