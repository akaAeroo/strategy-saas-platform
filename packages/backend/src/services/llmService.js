/**
 * 大模型 LLM 服务
 * 统一封装对公司内网模型（星探·源曦）的调用
 */

const axios = require('axios');
const { config } = require('../config');

class LLMService {
  constructor() {
    this.baseUrl = config.ai.opencode.baseUrl || 'http://10.4.16.154:5029/v1';
    this.apiKey = config.ai.opencode.apiKey;
    this.model = config.ai.opencode.model || 'quantgroup/xingtan';
    this.providerId = config.ai.opencode.providerId || 'quantgroup';
  }

  /**
   * 流式聊天完成
   * @param {string} systemPrompt - 系统提示词
   * @param {Array} messages - 消息历史 [{role, content}]
   * @param {Object} options - 可选参数
   * @returns {AsyncGenerator} 流式响应
   */
  async *streamChatCompletion(systemPrompt, messages, options = {}) {
    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096
    };

    // 如果配置了 provider_id，添加到请求体
    if (this.providerId) {
      requestBody.provider_id = this.providerId;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                yield content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('[LLMService] 流式调用失败:', error.message);
      throw error;
    }
  }

  /**
   * 非流式聊天完成
   * @param {string} systemPrompt - 系统提示词
   * @param {Array} messages - 消息历史
   * @param {Object} options - 可选参数
   * @returns {Promise<string>} 完整响应
   */
  async chatCompletion(systemPrompt, messages, options = {}) {
    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      stream: false,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096
    };

    if (this.providerId) {
      requestBody.provider_id = this.providerId;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('[LLMService] 调用失败:', error.message);
      throw error;
    }
  }

  /**
   * 生成文本（简化接口）
   * @param {string} prompt - 提示词
   * @param {Object} options - 可选参数
   * @returns {Promise<string>} 生成的文本
   */
  async generateText(prompt, options = {}) {
    return this.chatCompletion(
      '你是一个专业的AI助手，请根据用户的问题提供详细、准确的回答。',
      [{ role: 'user', content: prompt }],
      options
    );
  }

  /**
   * 生成JSON（结构化输出）
   * @param {string} prompt - 提示词
   * @param {Object} schema - JSON Schema
   * @returns {Promise<Object>} 解析后的JSON对象
   */
  async generateJSON(prompt, schema = null) {
    const systemPrompt = schema
      ? `你是一个专业的AI助手。请严格按照以下JSON Schema格式返回结果：\n${JSON.stringify(schema, null, 2)}\n只返回JSON，不要包含其他内容。`
      : '你是一个专业的AI助手。请返回JSON格式的结果，不要包含其他内容。';

    const response = await this.chatCompletion(systemPrompt, [{ role: 'user', content: prompt }]);
    
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.match(/```json\s*([\s\S]*?)```/) || 
                       response.match(/```\s*([\s\S]*?)```/) ||
                       [null, response];
      const jsonStr = jsonMatch[1].trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('[LLMService] JSON解析失败:', e.message);
      throw new Error('返回结果不是有效的JSON格式');
    }
  }

  /**
   * 分析文本
   * @param {string} text - 要分析的文本
   * @param {string} analysisType - 分析类型
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeText(text, analysisType = 'general') {
    const prompts = {
      general: `请分析以下文本，提取关键信息和洞察：\n\n${text}`,
      sentiment: `请分析以下文本的情感倾向（正面/负面/中性），并给出置信度：\n\n${text}`,
      summary: `请对以下文本进行摘要，提炼核心观点：\n\n${text}`,
      keywords: `请从以下文本中提取关键词和关键短语：\n\n${text}`,
      entities: `请识别以下文本中的命名实体（人名、地名、组织名等）：\n\n${text}`
    };

    const prompt = prompts[analysisType] || prompts.general;
    return this.generateText(prompt);
  }

  /**
   * 生成营销文案
   * @param {Object} params - 文案参数
   * @returns {AsyncGenerator} 流式生成的文案
   */
  async *generateMarketingCopy(params) {
    const { product, platform, style, audience } = params;
    
    const systemPrompt = `你是一位资深营销文案专家，擅长撰写高转化率的营销文案。
要求：
1. 文案要突出产品卖点，吸引目标用户
2. 符合平台调性和规范
3. 语言简洁有力，避免夸大和虚假宣传
4. 使用中文回复`;

    const prompt = `请为以下产品生成${style || '推广'}文案：

产品信息：
${JSON.stringify(product, null, 2)}

目标平台：${platform || '通用'}
目标受众：${audience || '普通消费者'}

请生成3-5条不同风格的文案，并简要说明每条文案的亮点。`;

    yield* this.streamChatCompletion(systemPrompt, [{ role: 'user', content: prompt }]);
  }

  /**
   * 数据分析洞察
   * @param {Array} data - 数据数组
   * @param {Object} context - 分析上下文
   * @returns {AsyncGenerator} 流式分析结果
   */
  async *analyzeData(data, context = {}) {
    const { dataDescription, analysisGoal } = context;
    
    const systemPrompt = `你是一位资深数据分析师，擅长从数据中发现洞察和趋势。
要求：
1. 分析要客观、准确
2. 提供可执行的洞察和建议
3. 使用中文回复
4. 格式清晰，使用Markdown`;

    const prompt = `请分析以下数据：

数据描述：${dataDescription || '用户提供的数据'}
分析目标：${analysisGoal || '发现数据中的关键洞察和趋势'}

数据样本（前50行）：
${JSON.stringify(data.slice(0, 50), null, 2)}

请提供：
1. 数据概览和关键指标
2. 主要发现和洞察
3. 异常检测（如有）
4.  actionable 建议`;

    yield* this.streamChatCompletion(systemPrompt, [{ role: 'user', content: prompt }]);
  }

  /**
   * 健康检查
   * @returns {Promise<boolean>} 服务是否可用
   */
  async healthCheck() {
    try {
      await this.chatCompletion(
        '你是一个测试助手，请只回复"OK"。',
        [{ role: 'user', content: '测试' }],
        { maxTokens: 10 }
      );
      return true;
    } catch (error) {
      console.error('[LLMService] 健康检查失败:', error.message);
      return false;
    }
  }
}

module.exports = new LLMService();
