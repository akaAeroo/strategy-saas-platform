/**
 * 云端大模型服务
 * 支持 OpenAI / Claude / 百度文心 / 阿里通义 / Kimi / 智谱 / 本地模型
 */

const axios = require('axios');
const { config } = require('../config');

class AIService {
  constructor() {
    this.provider = config.ai.provider;
    this.config = config.ai[this.provider];
    this.diagnosisConfig = config.ai.diagnosis;
  }

  /**
   * AI 人群诊断
   * @param {Object} segment - 人群信息
   * @param {Object} metrics - 人群指标
   * @returns {Promise<Object>} 诊断结果
   */
  async diagnoseSegment(segment, metrics) {
    const prompt = this._buildDiagnosisPrompt(segment, metrics);
    
    try {
      let result;
      
      switch (this.provider) {
        case 'openai':
          result = await this._callOpenAI(prompt);
          break;
        case 'anthropic':
          result = await this._callAnthropic(prompt);
          break;
        case 'baidu':
          result = await this._callBaidu(prompt);
          break;
        case 'alibaba':
          result = await this._callAlibaba(prompt);
          break;
        case 'moonshot':
          result = await this._callMoonshot(prompt);
          break;
        case 'zhipu':
          result = await this._callZhipu(prompt);
          break;
        case 'moonshot':
          result = await this._callMoonshot(prompt);
          break;
        case 'zhipu':
          result = await this._callZhipu(prompt);
          break;
        case 'minimax':
          result = await this._callMinimax(prompt);
          break;
        case 'opencode':
          result = await this._callOpenCode(prompt);
          break;
        case 'ollama':
          result = await this._callOllama(prompt);
          break;
        default:
          throw new Error(`不支持的AI提供商: ${this.provider}`);
      }
      
      // 解析并验证结果
      return this._parseDiagnosisResult(result, segment);
      
    } catch (error) {
      console.error('AI诊断失败:', error.message);
      // 返回模拟诊断结果
      return this._mockDiagnosis(segment, metrics);
    }
  }

  /**
   * 调用 OpenAI API
   */
  async _callOpenAI(prompt) {
    const response = await axios.post(
      `${this.config.baseUrl}/chat/completions`,
      {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是智能策略平台的人群诊断专家。请基于提供的人群数据，生成结构化诊断报告。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.diagnosisConfig.temperature,
        max_tokens: this.diagnosisConfig.maxTokens,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  }

  /**
   * 调用 Anthropic Claude API
   */
  async _callAnthropic(prompt) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.config.model,
        max_tokens: this.diagnosisConfig.maxTokens,
        temperature: this.diagnosisConfig.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    return response.data.content[0].text;
  }

  /**
   * 调用百度文心 API
   */
  async _callBaidu(prompt) {
    // 先获取 access_token
    const tokenRes = await axios.post(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.config.apiKey}&client_secret=${config.baidu.secretKey}`
    );
    
    const accessToken = tokenRes.data.access_token;
    
    const response = await axios.post(
      `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=${accessToken}`,
      {
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: this.diagnosisConfig.temperature
      }
    );
    
    return response.data.result;
  }

  /**
   * 调用阿里通义 API
   */
  async _callAlibaba(prompt) {
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: this.config.model,
        input: {
          messages: [
            { role: 'system', content: '你是人群诊断专家' },
            { role: 'user', content: prompt }
          ]
        },
        parameters: {
          temperature: this.diagnosisConfig.temperature,
          max_tokens: this.diagnosisConfig.maxTokens,
          result_format: 'message'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.output.choices[0].message.content;
  }

  /**
   * 调用 Kimi (Moonshot) API
   */
  async _callMoonshot(prompt) {
    const response = await axios.post(
      `${this.config.baseUrl}/chat/completions`,
      {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是智能策略平台的人群诊断专家。请基于提供的人群数据，生成结构化诊断报告。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.diagnosisConfig.temperature,
        max_tokens: this.diagnosisConfig.maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  }

  /**
   * 调用智谱 AI (ChatGLM) API
   */
  async _callZhipu(prompt) {
    const response = await axios.post(
      `${this.config.baseUrl}/chat/completions`,
      {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是智能策略平台的人群诊断专家。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.diagnosisConfig.temperature,
        max_tokens: this.diagnosisConfig.maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  }

  /**
   * 调用 MiniMax API
   * MiniMax 需要在 URL 中添加 GroupId 参数
   */
  async _callMinimax(prompt) {
    const groupId = this.config.groupId;
    const url = groupId 
      ? `${this.config.baseUrl}/chat/completions?GroupId=${groupId}`
      : `${this.config.baseUrl}/chat/completions`;
    
    const response = await axios.post(
      url,
      {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是智能策略平台的人群诊断专家。请基于提供的人群数据，生成结构化诊断报告。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.diagnosisConfig.temperature,
        max_tokens: this.diagnosisConfig.maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // MiniMax 返回格式可能不同
    if (response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content || response.data.choices[0].text;
    }
    if (response.data.reply) {
      return response.data.reply;
    }
    return JSON.stringify(response.data);
  }

  /**
   * 调用量化派 OpenCode API (星探·源曦)
   * OpenAI 兼容格式
   */
  async _callOpenCode(prompt) {
    const response = await axios.post(
      `${this.config.baseUrl}/chat/completions`,
      {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是智能策略平台的人群诊断专家。请基于提供的人群数据，生成结构化诊断报告。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.diagnosisConfig.temperature,
        max_tokens: this.diagnosisConfig.maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  }

  /**
   * 调用本地 Ollama API
   */
  async _callOllama(prompt) {
    const response = await axios.post(
      `${this.config.baseUrl}/api/chat`,
      {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是智能策略平台的人群诊断专家。请基于提供的人群数据，生成结构化诊断报告。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        options: {
          temperature: this.diagnosisConfig.temperature,
          num_predict: this.diagnosisConfig.maxTokens
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.message.content;
  }

  /**
   * 构建诊断 Prompt
   */
  _buildDiagnosisPrompt(segment, metrics) {
    return `请对以下人群进行健康度诊断，输出JSON格式报告：

人群信息：
- 名称: ${segment.name}
- 规模: ${metrics.scale?.toLocaleString()} 人
- 描述: ${segment.description || 'N/A'}

关键指标：
- 转化率: ${(metrics.conversion_rate * 100).toFixed(2)}%
- 7日流失率: ${(metrics.churn_rate_7d * 100).toFixed(2)}%
- 30日流失率: ${(metrics.churn_rate_30d * 100).toFixed(2)}%
- 平均客单价: ¥${metrics.avg_order_value || 0}

请输出以下格式的JSON：
{
  "health_score": 0-100的整数,
  "health_level": "excellent/good/warning/critical",
  "summary": "诊断摘要",
  "problems": [
    {
      "id": "p1",
      "severity": "critical/warning/info",
      "title": "问题标题",
      "description": "详细描述",
      "metric": "相关指标",
      "current_value": 当前值,
      "change_percent": 变化百分比
    }
  ],
  "opportunities": [
    {
      "id": "o1",
      "type": "growth/retention/reactivation",
      "title": "机会标题",
      "description": "详细描述",
      "potential_users": 潜在用户数,
      "confidence": 0-1的置信度
    }
  ],
  "suggestions": [
    {
      "id": "s1",
      "action": "建议行动",
      "priority": 1-5,
      "expected_outcome": "预期效果"
    }
  ]
}`;
  }

  /**
   * 解析诊断结果
   */
  _parseDiagnosisResult(result, segment) {
    try {
      // 如果是字符串，尝试解析JSON
      const data = typeof result === 'string' ? JSON.parse(result) : result;
      
      // 添加元数据
      return {
        segment_id: segment.id,
        segment_name: segment.name,
        ...data,
        generated_at: new Date().toISOString(),
        ai_provider: this.provider,
        ai_model: this.config.model
      };
    } catch (error) {
      console.error('解析AI结果失败:', error.message);
      return this._mockDiagnosis(segment, {});
    }
  }

  /**
   * 模拟诊断结果（当AI不可用时）
   */
  _mockDiagnosis(segment, metrics) {
    const segmentConfigs = {
      seg_high_value: {
        health_score: 72,
        health_level: 'warning',
        problems: [
          {
            id: 'p1',
            severity: 'warning',
            title: '流失率上升',
            description: '近7天流失率上升23%，主要受竞品大促影响',
            metric: 'churn_rate_7d',
            change_percent: 23,
            affected_users: 125000
          }
        ],
        opportunities: [
          {
            id: 'o1',
            type: 'reactivation',
            title: '高潜召回用户',
            description: '12.5万用户有流失风险但近期仍有访问',
            potential_users: 125000,
            confidence: 0.82
          }
        ]
      },
      seg_new_users: {
        health_score: 45,
        health_level: 'critical',
        problems: [
          {
            id: 'p1',
            severity: 'critical',
            title: '留存率极低',
            description: '7日留存率仅15%，远低于行业平均',
            metric: 'retention_7d',
            change_percent: -30,
            affected_users: 360000
          }
        ],
        opportunities: [
          {
            id: 'o1',
            type: 'retention',
            title: '新用户教育',
            description: '通过引导提升留存，预计挽回20%流失用户',
            potential_users: 240000,
            confidence: 0.75
          }
        ]
      },
      seg_silent: {
        health_score: 35,
        health_level: 'critical',
        problems: [
          {
            id: 'p1',
            severity: 'critical',
            title: '长期沉默',
            description: '60%用户超过30天未活跃',
            metric: 'inactive_rate_30d',
            change_percent: 9,
            affected_users: 480000
          }
        ],
        opportunities: [
          {
            id: 'o1',
            type: 'reactivation',
            title: '沉默用户唤醒',
            description: '针对历史购买用户进行召回',
            potential_users: 320000,
            confidence: 0.68
          }
        ]
      }
    };
    
    const config = segmentConfigs[segment.id] || segmentConfigs.seg_high_value;
    
    return {
      segment_id: segment.id,
      segment_name: segment.name,
      ...config,
      summary: `${segment.name}健康度评分为${config.health_score}分，${config.health_level === 'critical' ? '存在严重问题需要立即处理' : '整体良好但需关注'}`,
      suggestions: [
        {
          id: 's1',
          action: config.health_level === 'critical' ? '立即启动召回策略' : '优化运营策略',
          priority: 1,
          expected_outcome: '提升用户留存率',
          related_problem_id: 'p1'
        }
      ],
      metrics: metrics,
      generated_at: new Date().toISOString(),
      ai_provider: 'mock',
      ai_model: 'fallback'
    };
  }
}

module.exports = new AIService();
