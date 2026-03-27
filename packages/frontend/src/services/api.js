import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code !== 0) {
      throw new Error(data.message || '请求失败')
    }
    return data.data
  },
  (error) => {
    console.error('[API Error]', error)
    return Promise.reject(error)
  }
)

// 人群相关 API
export const segmentsApi = {
  // 获取人群列表
  getList: () => api.get('/segments'),
  
  // 获取人群详情
  getDetail: (id) => api.get(`/segments/${id}`),
  
  // 获取人群指标
  getMetrics: (id, params) => api.get(`/segments/${id}/metrics`, { params }),
  
  // 获取人群趋势
  getTrend: (id, days = 30) => api.get(`/segments/${id}/trend`, { params: { days } }),
  
  // AI 诊断
  diagnose: (id) => api.post(`/segments/${id}/diagnose`),
  
  // 获取诊断结果
  getDiagnosis: (id) => api.get(`/segments/${id}/diagnosis`),
  
  // 获取诊断历史
  getDiagnosisHistory: (id, limit = 10) => 
    api.get(`/segments/${id}/diagnosis/history`, { params: { limit } })
}

// 仪表盘 API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats')
}

export default api
