import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { data } = response;
    if (data.code !== 0) {
      throw new Error(data.message || '请求失败');
    }
    return data.data;
  },
  (error) => {
    console.error('[API Error]', error);
    return Promise.reject(error);
  }
);

// 人群相关 API
export const segmentsApi = {
  getList: () => api.get('/segments'),
  getDetail: (id) => api.get(`/segments/${id}`),
  getMetrics: (id, params) => api.get(`/segments/${id}/metrics`, { params }),
  getTrend: (id, days = 30) => api.get(`/segments/${id}/trend`, { params: { days } }),
  diagnose: (id) => api.post(`/segments/${id}/diagnose`),
  getDiagnosis: (id) => api.get(`/segments/${id}/diagnosis`),
  getDiagnosisHistory: (id, limit = 10) => 
    api.get(`/segments/${id}/diagnosis/history`, { params: { limit } })
};

// 仪表盘 API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats')
};

// 上传 API
export const uploadApi = {
  uploadExcel: (formData) => api.post('/upload/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPreview: (uploadId) => api.get(`/upload/preview/${uploadId}`),
  confirmImport: (uploadId, data) => api.post(`/upload/confirm/${uploadId}`, data),
  getSummary: (uploadId) => api.get(`/upload/summary/${uploadId}`)
};

// AI 对话 API
export const chatApi = {
  createSession: (uploadData) => api.post('/chat/create', { uploadData }),
  sendMessage: (sessionId, message) => api.post('/chat/send', { sessionId, message }),
  generateStrategy: (sessionId, requirements) => api.post('/chat/strategy', { sessionId, requirements }),
  getHistory: (sessionId) => api.get(`/chat/history/${sessionId}`)
};

export default api;
