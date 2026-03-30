/**
 * 通用对话 Skill
 * 处理一般性对话和问答
 */

const BaseSkill = require('./BaseSkill');
const { config } = require('../config');
const axios = require('axios');

class ChatSkill extends BaseSkill {
  constructor() {
    super({
      id: 'chat',
      name: '智能对话',
      description: '通用对话和策略咨询',
      icon: '💬',
      category: 'general',
      tags: ['对话', '问答', '咨询'],
      inputSchema: {
        question: { type: 'string', required: true, description: '用户问题' }
      },
      outputSchema: {
        answer: { type: 'string', description: 'AI 回答' }
      }
    });
  }

  async initialize() {
    await super.initialize();
    console.log('[ChatSkill] 初始化完成');
  }

  /**
   * 作为兜底 Skill，置信度较低
   */
  canHandle(input) {
    // 只要有问题就可以处理（兜底）
    if (input.question) {
      return 0.3;
    }
    return 0.1;
  }

  /**
   * 执行对话
   */
  async *execute(input, context = {}) {
    try {
      const prompt = this.buildPrompt(input, context);
      const stream = this.callAI(prompt, context);

      for await (const chunk of stream) {
        yield chunk;
      }

    } catch (error) {
      console.error('[ChatSkill] 执行错误:', error);
      yield { type: 'error', data: error.message };
    }
  }

  /**
   * 构建提示词
   */
  buildPrompt(input, context) {
    let prompt = input.question || input.query || '';

    // 添加上下文信息
    if (context.activeFiles && context.activeFiles.length > 0) {
      prompt = `当前分析的文件: ${context.activeFiles.map(f => f.filename).join(', ')}\n\n${prompt}`;
    }

    return prompt;
  }

  /**
   * 调用 AI
   */
  async *callAI(prompt, context) {
    const aiProvider = config.ai.provider;
    const aiConfig = config.ai[aiProvider];

    // 构建消息历史
    const messages = [
      {
        role: 'system',
        content: `你是智能策略平台的 AI 助手，帮助用户进行数据分析和策略制定。

## 角色定位
- 你是运营策略专家，擅长用户增长、留存、转化等运营领域
- 你能够理解数据，提供基于数据的建议
- 你会主动询问关键信息以提供更好的帮助

## 响应原则
1. 回答简洁明了，重点突出
2. 涉及数据时，使用具体数字
3. 提供可操作的建议
4. 如果不确定，诚实告知

## 可用功能
你可以引导用户使用以下功能：
- 📊 数据分析：上传 Excel/CSV 文件进行分析
- 🌐 网页搜索：搜索行业信息或抓取网页内容
- 🎯 策略生成：基于数据生成运营策略`
      }
    ];

    // 添加历史对话（短期记忆）
    if (context.recentMessages && context.recentMessages.length > 0) {
      const recent = context.recentMessages.slice(-10); // 最近 10 轮
      for (const msg of recent) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }

    // 添加当前问题
    messages.push({ role: 'user', content: prompt });

    const requestBody = {
      model: aiConfig.model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true
    };

    if (aiProvider === 'opencode' && aiConfig.providerId) {
      requestBody.provider_id = aiConfig.providerId;
    }

    const response = await axios.post(
      `${aiConfig.baseUrl}/chat/completions`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
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
            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
              yield { type: 'content', data: data.choices[0].delta.content };
            }
          } catch (e) {}
        }
      }
    }
  }
}

module.exports = ChatSkill;
