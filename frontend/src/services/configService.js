import api from './api';

const configService = {
  async getUploadConfig() {
    const res = await api.get('/config/upload');
    return res.data;
  },
};

export default configService;
