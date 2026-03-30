/**
 * Agent Skill 基类
 * 参考 OpenClaude 的 Skill 设计
 */

class BaseSkill {
  constructor(config = {}) {
    this.id = config.id || this.constructor.name.toLowerCase();
    this.name = config.name || '未命名 Skill';
    this.description = config.description || '';
    this.icon = config.icon || '🔧';
    this.agentId = config.agentId || null;
    
    this.inputSchema = config.inputSchema || {};
    this.outputSchema = config.outputSchema || {};
    this.config = config;
    
    this.stats = {
      executedCount: 0,
      lastExecutedAt: null,
      averageExecutionTime: 0
    };
  }

  async execute(input, context = {}) {
    throw new Error('子类必须实现 execute 方法');
  }

  async *executeStream(input, context = {}) {
    const result = await this.execute(input, context);
    yield { type: 'complete', data: result };
  }

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

  recordExecution(duration) {
    this.stats.executedCount++;
    this.stats.lastExecutedAt = Date.now();
    const total = this.stats.averageExecutionTime * (this.stats.executedCount - 1) + duration;
    this.stats.averageExecutionTime = total / this.stats.executedCount;
  }

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
}

module.exports = BaseSkill;
