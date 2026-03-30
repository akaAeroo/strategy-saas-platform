/**
 * 策略生成 Skill
 * 基于数据或对话生成运营策略
 */

const BaseSkill = require('./BaseSkill');
const { config } = require('../config');
const axios = require('axios');

class StrategySkill extends BaseSkill {
  constructor() {
    super({
      id: 'strategy',
      name: '策略生成',
      description: '基于数据分析生成运营策略方案',
      icon: '🎯',
      category: 'strategy',
      tags: ['策略', '运营', '方案', '增长'],
      inputSchema: {
        context: { type: 'object', required: false, description: '上下文数据' },
        fileId: { type: 'string', required: false, description: '关联的文件ID' },
        requirements: { type: 'string', required: false, description: '特殊要求' }
      },
      outputSchema: {
        strategy: { type: 'object', description: '结构化策略' },
        raw: { type: 'string', description: '原始文本' }
      }
    });
  }

  async initialize() {
    await super.initialize();
    console.log('[StrategySkill] 初始化完成');
  }

  /**
   * 检查是否可以处理此输入
   */
  canHandle(input) {
    let score = 0;

    // 明确触发词
    if (input.intent === 'strategy' || input.generateStrategy) {
      score += 1;
    }

    // 问题包含策略相关词
    if (input.question) {
      const keywords = ['策略', '方案', '计划', '运营', '增长', '召回', '留存', '转化'];
      if (keywords.some(k => input.question.includes(k))) {
        score += 0.6;
      }
    }

    // 有数据上下文
    if (input.context || input.fileId) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  /**
   * 执行策略生成
   */
  async *execute(input, context = {}) {
    try {
      yield { type: 'status', data: { status: 'generating' } };

      // 构建提示词
      const prompt = this.buildPrompt(input, context);

      // 调用 AI
      const stream = this.callAI(prompt);
      
      let fullContent = '';
      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          fullContent += chunk.data;
        }
        yield chunk;
      }

      // 解析策略
      const strategy = this.parseStrategy(fullContent);
      
      yield {
        type: 'complete',
        data: {
          strategy,
          raw: fullContent
        }
      };

    } catch (error) {
      console.error('[StrategySkill] 执行错误:', error);
      yield { type: 'error', data: error.message };
    }
  }

  /**
   * 构建提示词
   */
  buildPrompt(input, context) {
    let prompt = '';

    // 如果有数据上下文
    if (input.context) {
      prompt += `## 数据背景\n${JSON.stringify(input.context, null, 2)}\n\n`;
    }

    // 如果有对话历史
    if (context.recentMessages) {
      prompt += `## 之前的讨论\n${context.recentMessages}\n\n`;
    }

    prompt += `## 任务\n请生成一份完整的运营策略方案，包含以下内容：\n\n`;
    prompt += `1. **策略名称**：简洁有力的名称\n`;
    prompt += `2. **目标人群**：具体的人群细分描述\n`;
    prompt += `3. **核心目标**：要达成的业务指标\n`;
    prompt += `4. **触达方案**：渠道、时机、文案建议\n`;
    prompt += `5. **权益设计**：优惠券、积分、特权等\n`;
    prompt += `6. **预期效果**：预估转化率和收益\n`;
    prompt += `7. **执行步骤**：分阶段执行计划\n\n`;

    if (input.requirements) {
      prompt += `## 特殊要求\n${input.requirements}\n\n`;
    }

    prompt += `请以结构化的方式输出，便于系统解析执行。`;

    return prompt;
  }

  /**
   * 调用 AI
   */
  async *callAI(prompt) {
    const aiProvider = config.ai.provider;
    const aiConfig = config.ai[aiProvider];

    const requestBody = {
      model: aiConfig.model,
      messages: [
        {
          role: 'system',
          content: `你是智能策略平台的策略专家，擅长基于数据分析制定运营策略。

## 策略设计原则
1. 数据驱动：基于提供的数据事实
2. 可执行性：给出具体的执行步骤
3. 效果可衡量：设定明确的 KPI
4. 资源可行：考虑实施成本

## 输出格式
使用 Markdown 格式，关键数据加粗，结构化呈现。`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 4000,
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

  /**
   * 解析策略内容
   */
  parseStrategy(content) {
    try {
      // 尝试提取 JSON
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       content.match(/({[\s\S]*})/);
      
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return { type: 'structured', data, raw: content };
      }
    } catch (e) {
      // JSON 解析失败
    }
    
    return { type: 'text', data: content, raw: content };
  }
}

module.exports = StrategySkill;
