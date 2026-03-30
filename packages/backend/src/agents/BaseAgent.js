/**
 * Agent 基类
 * 所有Agent必须继承此类
 * 提供统一的记忆管理和知识库访问能力
 */

const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const MemoryManager = require('./memory/MemoryManager');
const KnowledgeBase = require('./knowledge/KnowledgeBase');
const llmService = require('../services/llmService');

class BaseAgent {
  constructor(config = {}) {
    this.id = config.id || this.constructor.name.toLowerCase();
    this.name = config.name || '未命名Agent';
    this.description = config.description || '';
    this.icon = config.icon || '🤖';
    this.category = config.category || 'general';
    
    // 数据目录
    this.dataDir = config.dataDir || path.join(__dirname, '../../data/agents', this.id);
    
    // 初始化记忆管理器
    this.memory = new MemoryManager({
      agentId: this.id,
      dataDir: path.join(this.dataDir, 'memory')
    });
    
    // 初始化知识库
    this.knowledge = new KnowledgeBase({
      agentId: this.id,
      dataDir: path.join(this.dataDir, 'knowledge')
    });
    
    // 状态
    this.isReady = false;
    this.config = config;
    this.lastError = null;
  }

  /**
   * 初始化Agent
   */
  async initialize() {
    try {
      // 确保目录存在
      await fs.ensureDir(this.dataDir);
      
      // 初始化记忆系统
      await this.memory.initialize();
      
      // 初始化知识库
      await this.knowledge.initialize();
      
      this.isReady = true;
      console.log(`[Agent:${this.id}] 初始化完成`);
      return true;
    } catch (error) {
      this.lastError = error;
      console.error(`[Agent:${this.id}] 初始化失败:`, error);
      return false;
    }
  }

  /**
   * 执行Agent的核心方法
   * 所有子类必须实现此方法
   * @param {Object} input - 输入数据
   * @param {Object} context - 上下文
   * @returns {AsyncGenerator} 流式输出
   */
  async *execute(input, context = {}) {
    throw new Error('子类必须实现 execute 方法');
  }

  /**
   * 获取Agent信息
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      icon: this.icon,
      category: this.category,
      isReady: this.isReady,
      config: this.config,
      memory: this.memory.getStats(),
      knowledge: this.knowledge.getStats()
    };
  }

  /**
   * 获取系统提示词（包含知识库上下文）
   */
  async getSystemPrompt(userQuery = '') {
    // 从知识库检索相关信息
    const relevantKnowledge = await this.knowledge.search(userQuery, 3);
    
    // 从长期记忆获取用户偏好
    const userPreferences = await this.memory.getLongTerm('preferences') || {};
    
    const basePrompt = `你是${this.name}。${this.description}

## 核心能力
${this.getCapabilitiesDescription()}

## 相关知识
${relevantKnowledge.map((k, i) => `${i + 1}. ${k.content}`).join('\n')}

## 用户偏好
${JSON.stringify(userPreferences, null, 2)}

## 输出规范
- 使用中文回复
- 回答简洁专业
- 不确定时诚实告知`;

    return basePrompt;
  }

  /**
   * 获取能力描述（子类覆盖）
   */
  getCapabilitiesDescription() {
    return '- 处理用户请求\n- 使用记忆和知识库';
  }

  /**
   * 记录对话到记忆
   */
  async recordConversation(userMessage, assistantResponse, metadata = {}) {
    // 短期记忆：当前对话
    await this.memory.addShortTerm({
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
      ...metadata
    });
    
    await this.memory.addShortTerm({
      role: 'assistant',
      content: assistantResponse,
      timestamp: Date.now(),
      agent: this.id
    });

    // 中期记忆：重要会话归档
    if (metadata.important) {
      await this.memory.addMediumTerm({
        type: 'conversation',
        summary: this.summarizeConversation(userMessage, assistantResponse),
        timestamp: Date.now()
      });
    }
  }

  /**
   * 简单总结对话（子类可覆盖）
   */
  summarizeConversation(userMessage, assistantResponse) {
    return {
      query: userMessage.slice(0, 50),
      response: assistantResponse.slice(0, 100)
    };
  }

  /**
   * 检查是否可以处理此输入
   */
  canHandle(input) {
    return 0.5; // 默认中等置信度
  }

  /**
   * 调用大模型生成流式响应
   * @param {string} systemPrompt - 系统提示词
   * @param {Array} messages - 消息历史
   * @param {Object} options - 可选参数
   * @returns {AsyncGenerator} 流式响应
   */
  async *callLLM(systemPrompt, messages, options = {}) {
    try {
      yield* llmService.streamChatCompletion(systemPrompt, messages, options);
    } catch (error) {
      console.error(`[Agent:${this.id}] LLM调用失败:`, error.message);
      throw error;
    }
  }

  /**
   * 调用大模型生成非流式响应
   * @param {string} systemPrompt - 系统提示词
   * @param {Array} messages - 消息历史
   * @param {Object} options - 可选参数
   * @returns {Promise<string>} 完整响应
   */
  async callLLMText(systemPrompt, messages, options = {}) {
    try {
      return await llmService.chatCompletion(systemPrompt, messages, options);
    } catch (error) {
      console.error(`[Agent:${this.id}] LLM调用失败:`, error.message);
      throw error;
    }
  }

  /**
   * 生成营销文案（内容类Agent使用）
   * @param {Object} params - 文案参数
   * @returns {AsyncGenerator} 流式生成的文案
   */
  async *generateMarketingCopy(params) {
    yield* llmService.generateMarketingCopy(params);
  }

  /**
   * 分析数据（数据分析类Agent使用）
   * @param {Array} data - 数据数组
   * @param {Object} context - 分析上下文
   * @returns {AsyncGenerator} 流式分析结果
   */
  async *analyzeDataWithLLM(data, context = {}) {
    yield* llmService.analyzeData(data, context);
  }

  /**
   * 错误处理
   */
  handleError(error) {
    this.lastError = error;
    console.error(`[Agent:${this.id}] 执行错误:`, error);
    
    return {
      type: 'error',
      agent: this.id,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = BaseAgent;
