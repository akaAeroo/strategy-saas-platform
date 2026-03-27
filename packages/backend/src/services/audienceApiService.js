/**
 * 公司云端数据API服务
 * 对接人群DB API，获取人群数据
 */

const axios = require('axios');
const { config } = require('../config');

class AudienceApiService {
  constructor() {
    this.client = axios.create({
      baseURL: config.audienceApi.url,
      timeout: config.audienceApi.timeout,
      headers: {
        'Authorization': `Bearer ${config.audienceApi.key}`,
        'Content-Type': 'application/json',
      }
    });
    
    // 是否使用模拟数据
    this.useMock = !config.audienceApi.url || !config.audienceApi.key;
  }

  /**
   * 获取人群列表
   */
  async getSegments() {
    if (this.useMock) {
      return this._mockSegments();
    }
    
    try {
      const response = await this.client.get('/v1/segments');
      return response.data;
    } catch (error) {
      console.error('获取人群列表失败:', error.message);
      // 失败时返回模拟数据
      return this._mockSegments();
    }
  }

  /**
   * 获取人群详情
   */
  async getSegmentDetail(segmentId) {
    if (this.useMock) {
      return this._mockSegmentDetail(segmentId);
    }
    
    try {
      const response = await this.client.get(`/v1/segments/${segmentId}`);
      return response.data;
    } catch (error) {
      console.error(`获取人群详情失败: ${segmentId}`, error.message);
      return this._mockSegmentDetail(segmentId);
    }
  }

  /**
   * 获取人群指标数据
   */
  async getSegmentMetrics(segmentId, params = {}) {
    if (this.useMock) {
      return this._mockSegmentMetrics(segmentId);
    }
    
    try {
      const response = await this.client.get(`/v1/segments/${segmentId}/metrics`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error(`获取人群指标失败: ${segmentId}`, error.message);
      return this._mockSegmentMetrics(segmentId);
    }
  }

  /**
   * 圈选人群
   */
  async segmentAudience(conditions) {
    if (this.useMock) {
      return this._mockSegmentResult();
    }
    
    try {
      const response = await this.client.post('/v1/segment', {
        conditions,
        options: {
          include_users: false,
          format: 'count_only'
        }
      });
      return response.data;
    } catch (error) {
      console.error('圈选人群失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取人群趋势数据
   */
  async getSegmentTrend(segmentId, days = 30) {
    if (this.useMock) {
      return this._mockSegmentTrend(segmentId, days);
    }
    
    try {
      const response = await this.client.get(`/v1/segments/${segmentId}/trend`, {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error(`获取人群趋势失败: ${segmentId}`, error.message);
      return this._mockSegmentTrend(segmentId, days);
    }
  }

  // ========== 模拟数据 ==========

  _mockSegments() {
    return {
      code: 0,
      data: [
        {
          id: 'seg_high_value',
          name: '高价值用户',
          level: 1,
          description: '最近30天有购买且客单价>500的用户',
          scale: 500000,
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'seg_new_users',
          name: '新用户',
          level: 2,
          description: '注册7天内的新用户',
          scale: 1200000,
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'seg_silent',
          name: '沉默用户',
          level: 3,
          description: '30天未活跃的老用户',
          scale: 800000,
          created_at: '2024-01-15T10:00:00Z'
        }
      ]
    };
  }

  _mockSegmentDetail(segmentId) {
    const segments = {
      seg_high_value: {
        id: 'seg_high_value',
        name: '高价值用户',
        level: 1,
        definition: {
          conditions: [
            { field: 'last_purchase_days', operator: 'lte', value: 30 },
            { field: 'avg_order_value', operator: 'gt', value: 500 },
            { field: 'total_orders', operator: 'gte', value: 3 }
          ]
        },
        scale: 500000,
        created_at: '2024-01-15T10:00:00Z'
      },
      seg_new_users: {
        id: 'seg_new_users',
        name: '新用户',
        level: 2,
        definition: {
          conditions: [
            { field: 'register_days', operator: 'lte', value: 7 }
          ]
        },
        scale: 1200000,
        created_at: '2024-01-15T10:00:00Z'
      },
      seg_silent: {
        id: 'seg_silent',
        name: '沉默用户',
        level: 3,
        definition: {
          conditions: [
            { field: 'last_active_days', operator: 'gt', value: 30 },
            { field: 'register_days', operator: 'gt', value: 30 }
          ]
        },
        scale: 800000,
        created_at: '2024-01-15T10:00:00Z'
      }
    };
    
    return {
      code: 0,
      data: segments[segmentId] || segments.seg_high_value
    };
  }

  _mockSegmentMetrics(segmentId) {
    const baseMetrics = {
      seg_high_value: {
        scale: 500000,
        conversion_rate: 0.085,
        churn_rate_7d: 0.025,
        churn_rate_30d: 0.08,
        avg_order_value: 850,
        avg_orders_per_user: 5.2,
        gmv_30d: 42500000
      },
      seg_new_users: {
        scale: 1200000,
        conversion_rate: 0.021,
        churn_rate_7d: 0.15,
        churn_rate_30d: 0.45,
        avg_order_value: 120,
        avg_orders_per_user: 1.1,
        gmv_30d: 3024000
      },
      seg_silent: {
        scale: 800000,
        conversion_rate: 0.005,
        churn_rate_7d: 0.02,
        churn_rate_30d: 0.60,
        avg_order_value: 0,
        avg_orders_per_user: 0,
        gmv_30d: 0
      }
    };
    
    return {
      code: 0,
      data: baseMetrics[segmentId] || baseMetrics.seg_high_value
    };
  }

  _mockSegmentTrend(segmentId, days) {
    const trend = [];
    const baseValue = segmentId === 'seg_high_value' ? 500000 : 
                      segmentId === 'seg_new_users' ? 1200000 : 800000;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      trend.push({
        date: date.toISOString().split('T')[0],
        scale: Math.floor(baseValue * (1 + (Math.random() - 0.5) * 0.1)),
        active_users: Math.floor(baseValue * 0.3 * (1 + (Math.random() - 0.5) * 0.2)),
        conversion_rate: 0.05 + Math.random() * 0.05
      });
    }
    
    return {
      code: 0,
      data: trend
    };
  }

  _mockSegmentResult() {
    return {
      code: 0,
      data: {
        segment_id: `seg_${Date.now()}`,
        estimated_size: Math.floor(Math.random() * 1000000),
        status: 'completed',
        generated_at: new Date().toISOString()
      }
    };
  }
}

module.exports = new AudienceApiService();
