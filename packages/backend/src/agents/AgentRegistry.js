/**
 * Agent 注册中心
 * 管理所有 Agent 的注册、发现和路由
 */

const BaseAgent = require('./BaseAgent');

class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.categories = new Map();
  }

  /**
   * 注册 Agent
   */
  async register(agent) {
    if (!(agent instanceof BaseAgent)) {
      throw new Error('Agent 必须继承 BaseAgent');
    }

    // 初始化
    await agent.initialize();

    if (this.agents.has(agent.id)) {
      console.warn(`Agent ${agent.id} 已存在，将被覆盖`);
    }

    this.agents.set(agent.id, agent);
    
    // 按分类组织
    if (!this.categories.has(agent.category)) {
      this.categories.set(agent.category, []);
    }
    this.categories.get(agent.category).push(agent);
    
    console.log(`[AgentRegistry] 注册 Agent: ${agent.id} (${agent.name})`);
    return agent;
  }

  /**
   * 获取 Agent
   */
  get(id) {
    return this.agents.get(id);
  }

  /**
   * 获取所有 Agents
   */
  getAll() {
    return Array.from(this.agents.values());
  }

  /**
   * 按分类获取 Agents
   */
  getByCategory(category) {
    return this.categories.get(category) || [];
  }

  /**
   * 自动路由 - 选择最适合处理输入的 Agent
   */
  async route(input, preferredAgent = null) {
    // 如果指定了首选 Agent，优先使用
    if (preferredAgent && this.agents.has(preferredAgent)) {
      return this.agents.get(preferredAgent);
    }

    // 计算每个 Agent 的置信度
    const scores = [];
    for (const agent of this.agents.values()) {
      const score = await agent.canHandle(input);
      scores.push({ agent, score });
    }

    // 排序并选择最高分
    scores.sort((a, b) => b.score - a.score);
    
    if (scores.length === 0 || scores[0].score < 0.3) {
      return null;
    }

    return scores[0].agent;
  }

  /**
   * 获取所有 Agent 信息
   */
  getAllInfo() {
    return this.getAll().map(agent => agent.getInfo());
  }

  /**
   * 初始化所有 Agents
   */
  async initializeAll() {
    for (const agent of this.agents.values()) {
      if (!agent.isReady) {
        await agent.initialize();
      }
    }
  }
}

// 导出单例
module.exports = new AgentRegistry();
