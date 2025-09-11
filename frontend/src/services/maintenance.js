import api from './api';

// Service Maintenance API
// Base: /api/v1/maintenance

export async function getStorageUsage() {
  const { data } = await api.get('/maintenance/storage/usage');
  return data;
}

export async function emptyTrash() {
  const { data } = await api.post('/maintenance/trash/empty');
  return data;
}

export async function getTempStats() {
  const { data } = await api.get('/maintenance/temp-files/stats');
  return data;
}

export default {
  getStorageUsage,
  emptyTrash,
  getTempStats,
};
