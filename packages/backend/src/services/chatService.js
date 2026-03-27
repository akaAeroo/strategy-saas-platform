/**
 * AI 对话服务
 * 支持流式输出
 */

const axios = require('axios');
const { config } = require('../config');

// 对话上下文存储（内存，生产环境用 Redis）
const chatSessions = new Map();

class ChatService {
  constructor() {
    this.provider = config.ai.provider;
    this.aiConfig = config.ai[this.provider];
  }

  /**
   * 创建新会话
   */
  createSession(uploadData = null) {
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      messages: [],
      uploadData,
      createdAt: Date.now()
    };
    chatSessions.set(sessionId, session);
    return session;
  }

  /**
   * 获取会话
   */
  getSession(sessionId) {
    return chatSessions.get(sessionId);
  }

  /**
   * 添加消息到会话
   */
  addMessage(sessionId, role, content) {
    const session = chatSessions.get(sessionId);
    if (session) {
      session.messages.push({ role, content, timestamp: Date.now() });
      // 只保留最近 20 条消息
      if (session.messages.length > 20) {
        session.messages = session.messages.slice(-20);
      }
    }
  }

  /**
   * 流式对话
   */
  async *streamChat(sessionId, userMessage) {
    const session = chatSessions.get(sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    // 添加用户消息
    this.addMessage(sessionId, 'user', userMessage);

    // 构建系统提示词
    const systemPrompt = this._buildSystemPrompt(session.uploadData);

    // 构建消息历史
    const messages = [
      { role: 'system', content: systemPrompt },
      ...session.messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
    ];

    try {
      let fullResponse = '';

      // 根据提供商调用不同的 API
      if (this.provider === 'minimax') {
        yield* this._streamMinimax(messages);
      } else if (this.provider === 'openai') {
        yield* this._streamOpenAI(messages);
      } else {
        // 其他提供商使用模拟流式
        const response = await this._callAI(messages);
        fullResponse = response;
        yield { type: 'content', data: response };
      }

      // 保存助手回复
      this.addMessage(sessionId, 'assistant', fullResponse);

      yield { type: 'done' };
    } catch (error) {
      console.error('AI 对话失败:', error);
      yield { type: 'error', data: error.message };
    }
  }

  /**
   * 构建系统提示词
   */
  _buildSystemPrompt(uploadData) {
    let prompt = `你是智能策略平台的 AI 助手，擅长用户数据分析和营销策略制定。

你的能力：
1. 分析用户人群数据，识别特征和规律
2. 发现潜在问题和机会
3. 生成针对性的运营策略
4. 提供可执行的建议

输出格式：
- 使用 Markdown 格式
- 关键数据用加粗显示
- 策略建议分点列出
- 包含具体的人群细分和触达方案`;

    if (uploadData) {
      prompt += `\n\n当前分析的人群数据：\n${JSON.stringify(uploadData.summary, null, 2)}\n`;
    }

    return prompt;
  }

  /**
   * MiniMax 流式 API
   */
  async *_streamMinimax(messages) {
    const response = await axios.post(
      `${this.aiConfig.baseUrl}/chat/completions`,
      {
        model: this.aiConfig.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      },
      {
        headers: {
          'Authorization': `Bearer ${this.aiConfig.apiKey}`,
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
      buffer = lines.pop();

      for (const line of lines) {
        if (line.trim() === '' || line === 'data: [DONE]') continue;
        
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices && data.choices[0].delta.content) {
              yield { type: 'content', data: data.choices[0].delta.content };
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }

  /**
   * OpenAI 流式 API
   */
  async *_streamOpenAI(messages) {
    const response = await axios.post(
      `${this.aiConfig.baseUrl}/chat/completions`,
      {
        model: this.aiConfig.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      },
      {
        headers: {
          'Authorization': `Bearer ${this.aiConfig.apiKey}`,
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
      buffer = lines.pop();

      for (const line of lines) {
        if (line.trim() === '' || line === 'data: [DONE]') continue;
        
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices && data.choices[0].delta.content) {
              yield { type: 'content', data: data.choices[0].delta.content };
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }

  /**
   * 非流式调用（备用）
   */
  async _callAI(messages) {
    const response = await axios.post(
      `${this.aiConfig.baseUrl}/chat/completions`,
      {
        model: this.aiConfig.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * 生成策略
   */
  async generateStrategy(sessionId, requirements = '') {
    const session = chatSessions.get(sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    const prompt = `基于以上分析，请生成一份完整的运营策略方案，包含以下内容：

1. **策略名称**：简洁有力的名称
2. **目标人群**：具体的人群细分
3. **核心目标**：要达成的业务指标
4. **执行方案**：
   - 触达渠道（Push/短信/站内信等）
   - 触达时机
   - 文案建议
5. **权益设计**：优惠券/积分/特权等
6. **预期效果**：预估转化率和收益
7. **执行步骤**：分阶段执行计划

请以 JSON 格式输出，便于系统解析执行。

用户额外要求：${requirements || '无'}`;

    const messages = [
      { role: 'system', content: this._buildSystemPrompt(session.uploadData) },
      ...session.messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: prompt }
    ];

    const response = await this._callAI(messages);
    
    // 尝试解析 JSON
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                       response.match(/```\n([\s\S]*?)\n```/) ||
                       response.match(/({[\s\S]*})/);
      
      if (jsonMatch) {
        const strategy = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return { type: 'structured', data: strategy, raw: response };
      }
    } catch (e) {
      // JSON 解析失败，返回文本
    }

    return { type: 'text', data: response };
  }
}

module.exports = new ChatService();
