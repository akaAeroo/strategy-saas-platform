/**
 * Skill 注册中心
 * 管理所有 Skill 的注册、发现和路由
 */

const BaseSkill = require('./BaseSkill');

class SkillRegistry {
  constructor() {
    this.skills = new Map();
    this.categories = new Map();
  }

  /**
   * 注册 Skill
   */
  register(skill) {
    if (!(skill instanceof BaseSkill)) {
      throw new Error('Skill 必须继承 BaseSkill');
    }

    if (this.skills.has(skill.id)) {
      console.warn(`Skill ${skill.id} 已存在，将被覆盖`);
    }

    this.skills.set(skill.id, skill);
    
    // 按分类组织
    if (!this.categories.has(skill.category)) {
      this.categories.set(skill.category, []);
    }
    this.categories.get(skill.category).push(skill);
    
    console.log(`[SkillRegistry] 注册 Skill: ${skill.id} (${skill.name})`);
    return skill;
  }

  /**
   * 获取 Skill
   */
  get(id) {
    return this.skills.get(id);
  }

  /**
   * 获取所有 Skills
   */
  getAll() {
    return Array.from(this.skills.values());
  }

  /**
   * 按分类获取 Skills
   */
  getByCategory(category) {
    return this.categories.get(category) || [];
  }

  /**
   * 自动路由 - 选择最适合处理输入的 Skill
   */
  async route(input, preferredSkill = null) {
    // 如果指定了首选 Skill，优先使用
    if (preferredSkill && this.skills.has(preferredSkill)) {
      const skill = this.skills.get(preferredSkill);
      const validation = skill.validateInput(input);
      if (validation.valid) {
        return skill;
      }
    }

    // 计算每个 Skill 的置信度
    const scores = [];
    for (const skill of this.skills.values()) {
      const score = await skill.canHandle(input);
      scores.push({ skill, score });
    }

    // 排序并选择最高分
    scores.sort((a, b) => b.score - a.score);
    
    if (scores.length === 0 || scores[0].score < 0.3) {
      return null; // 没有合适的 Skill
    }

    return scores[0].skill;
  }

  /**
   * 获取所有 Skill 信息（用于前端展示）
   */
  getAllInfo() {
    return this.getAll().map(skill => skill.getInfo());
  }

  /**
   * 初始化所有 Skills
   */
  async initializeAll() {
    for (const skill of this.skills.values()) {
      try {
        await skill.initialize();
      } catch (error) {
        console.error(`[SkillRegistry] 初始化 ${skill.id} 失败:`, error);
      }
    }
  }
}

// 导出单例
module.exports = new SkillRegistry();
