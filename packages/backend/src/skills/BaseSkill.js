/**
 * Skill 基类
 * 参考 OpenClaude Skill 设计模式
 * 所有 Skill 必须继承此类
 */

class BaseSkill {
  constructor(config = {}) {
    this.id = config.id || this.constructor.name.toLowerCase();
    this.name = config.name || '未命名 Skill';
    this.description = config.description || '';
    this.icon = config.icon || '🔧';
    this.agentId = config.agentId || null;
    
    // 输入输出定义
    this.inputSchema = config.inputSchema || {};
    this.outputSchema = config.outputSchema || {};
    
    // 配置
    this.config = config;
    
    // 执行统计
    this.stats = {
      executedCount: 0,
      lastExecutedAt: null,
      averageExecutionTime: 0
    };
  }

  /**
   * 执行 Skill
   * 子类必须实现此方法
   */
  async execute(input, context = {}) {
    throw new Error('子类必须实现 execute 方法');
  }

  /**
   * 流式执行
   */
  async *executeStream(input, context = {}) {
    const result = await this.execute(input, context);
    yield { type: 'complete', data: result };
  }

  /**
   * 验证输入
   */
  validateInput(input) {
    const errors = [];
    
    for (const [key, schema] of Object.entries(this.inputSchema)) {
      if (schema.required && (input[key] === undefined || input[key] === null)) {
        errors.push(`缺少必填参数: ${key}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 记录执行
   */
  recordExecution(duration) {
    this.stats.executedCount++;
    this.stats.lastExecutedAt = Date.now();
    const total = this.stats.averageExecutionTime * (this.stats.executedCount - 1) + duration;
    this.stats.averageExecutionTime = total / this.stats.executedCount;
  }

  /**
   * 获取信息
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      icon: this.icon,
      agentId: this.agentId,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      stats: this.stats
    };
  }

  /**
   * 检查是否可以处理
   */
  canHandle(input) {
    const validation = this.validateInput(input);
    return validation.valid ? 0.5 : 0;
  }
}

module.exports = BaseSkill;
