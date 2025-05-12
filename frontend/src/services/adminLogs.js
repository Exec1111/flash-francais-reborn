import api from './api';

export async function fetchLLMLogs() {
  const res = await api.get('/api/v1/admin/llm-logs');
  return res.data.logs;
}
