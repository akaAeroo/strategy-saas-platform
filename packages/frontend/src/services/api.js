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

// 上传 API（传统方式）
export const uploadApi = {
  uploadExcel: (formData) => api.post('/upload/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPreview: (uploadId) => api.get(`/upload/preview/${uploadId}`),
  confirmImport: (uploadId, data) => api.post(`/upload/confirm/${uploadId}`, data),
  getSummary: (uploadId) => api.get(`/upload/summary/${uploadId}`)
};

// AI 对话 API（传统方式）
export const chatApi = {
  createSession: (uploadData) => api.post('/chat/create', { uploadData }),
  sendMessage: (sessionId, message) => api.post('/chat/send', { sessionId, message }),
  generateStrategy: (sessionId, requirements) => api.post('/chat/strategy', { sessionId, requirements }),
  getHistory: (sessionId) => api.get(`/chat/history/${sessionId}`)
};

// AI Data Analyst API（新 - AI 直接分析）
export const aiAnalyzeApi = {
  // 上传文件并创建分析会话
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ai-analyze/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 获取会话信息
  getSession: (sessionId) => api.get(`/ai-analyze/session/${sessionId}`),
  
  // 流式分析（返回 EventSource URL）
  getStreamUrl: (sessionId, question = '') => {
    const params = new URLSearchParams({ sessionId });
    if (question) params.append('question', question);
    return `/api/ai-analyze/stream?${params.toString()}`;
  },
  
  // 非流式问答
  ask: (sessionId, question) => api.post('/ai-analyze/ask', { sessionId, question }),
  
  // 删除会话
  deleteSession: (sessionId) => api.delete(`/ai-analyze/session/${sessionId}`)
};

// Web Search API（网页抓取和搜索）
export const webSearchApi = {
  // 抓取单个网页
  fetchUrl: (url) => api.post('/web-search/fetch', { url }),
  
  // 搜索引擎查询
  search: (query, limit = 5) => api.get('/web-search/search', { 
    params: { q: query, limit } 
  }),
  
  // 深度搜索（搜索 + 抓取）
  deepSearch: (query, searchLimit = 5, fetchLimit = 3) => api.get('/web-search/deep-search', {
    params: { q: query, searchLimit, fetchLimit }
  }),
  
  // 流式 AI 分析搜索（SSE URL）
  getStreamAnalyzeUrl: (query, question = '') => {
    const params = new URLSearchParams({ q: query });
    if (question) params.append('question', question);
    return `/api/web-search/stream-analyze?${params.toString()}`;
  },
  
  // 分析单个 URL（SSE）
  analyzeUrl: (url, question = '') => {
    const params = new URLSearchParams({ url });
    if (question) params.append('question', question);
    return `/api/web-search/analyze-url?${params.toString()}`;
  },
  
  // 检查服务状态
  getStatus: () => api.get('/web-search/status')
};

export default api;
