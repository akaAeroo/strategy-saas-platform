/**
 * 记忆管理器
 * 管理三层记忆：短期、中期、长期
 * 每个Agent拥有独立的记忆空间
 */

const fs = require('fs-extra');
const path = require('path');

class MemoryManager {
  constructor({ agentId, dataDir }) {
    this.agentId = agentId;
    this.dataDir = dataDir;
    
    // 内存中的短期记忆
    this.shortTerm = [];
    
    // 配置
    this.config = {
      shortTermLimit: 20,      // 短期记忆保留最近20条
      mediumTermLimit: 100,    // 中期记忆保留100条
      longTermSyncInterval: 24 * 60 * 60 * 1000 // 长期记忆每天同步一次
    };
  }

  /**
   * 初始化
   */
  async initialize() {
    await fs.ensureDir(this.dataDir);
    await fs.ensureDir(path.join(this.dataDir, 'medium-term'));
    
    // 加载长期记忆
    await this.loadLongTerm();
    
    console.log(`[Memory:${this.agentId}] 初始化完成`);
  }

  /**
   * ==================== 短期记忆 ====================
   * 特点：保存在内存中，重启丢失，用于当前对话上下文
   */
  
  addShortTerm(item) {
    this.shortTerm.push({
      id: `stm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...item,
      timestamp: item.timestamp || Date.now()
    });
    
    // 限制大小
    if (this.shortTerm.length > this.config.shortTermLimit) {
      this.shortTerm = this.shortTerm.slice(-this.config.shortTermLimit);
    }
  }

  getShortTerm(limit = 10) {
    return this.shortTerm.slice(-limit);
  }

  clearShortTerm() {
    this.shortTerm = [];
  }

  /**
   * ==================== 中期记忆 ====================
   * 特点：保存在本地JSON文件，30天内的数据
   */
  
  async addMediumTerm(item) {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filePath = path.join(this.dataDir, 'medium-term', `${date}.json`);
    
    let dayData = [];
    if (await fs.pathExists(filePath)) {
      dayData = await fs.readJson(filePath);
    }
    
    dayData.push({
      id: `mtm_${Date.now()}`,
      ...item,
      timestamp: Date.now()
    });
    
    await fs.writeJson(filePath, dayData);
    
    // 清理过期数据
    await this.cleanMediumTerm();
  }

  async getMediumTerm(days = 7) {
    const results = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const filePath = path.join(this.dataDir, 'medium-term', `${date}.json`);
      
      if (await fs.pathExists(filePath)) {
        const dayData = await fs.readJson(filePath);
        results.push(...dayData);
      }
    }
    
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  async cleanMediumTerm() {
    const mediumTermDir = path.join(this.dataDir, 'medium-term');
    const files = await fs.readdir(mediumTermDir);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      const filePath = path.join(mediumTermDir, file);
      const stat = await fs.stat(filePath);
      if (stat.mtime.getTime() < thirtyDaysAgo) {
        await fs.remove(filePath);
      }
    }
  }

  /**
   * ==================== 长期记忆 ====================
   * 特点：保存在localStorage（前端）或JSON文件（后端），永久保留
   */
  
  async loadLongTerm() {
    const filePath = path.join(this.dataDir, 'long-term.json');
    if (await fs.pathExists(filePath)) {
      this.longTerm = await fs.readJson(filePath);
    } else {
      this.longTerm = {};
    }
  }

  async saveLongTerm() {
    const filePath = path.join(this.dataDir, 'long-term.json');
    await fs.writeJson(filePath, this.longTerm);
  }

  async setLongTerm(key, value) {
    this.longTerm[key] = {
      value,
      updatedAt: Date.now()
    };
    await this.saveLongTerm();
  }

  async getLongTerm(key) {
    return this.longTerm[key]?.value;
  }

  /**
   * 学习用户偏好（用于长期记忆）
   */
  async learnPreference(key, value) {
    const preferences = await this.getLongTerm('preferences') || {};
    
    if (!preferences[key]) {
      preferences[key] = [];
    }
    
    preferences[key].push({
      value,
      count: 1,
      lastUsed: Date.now()
    });
    
    // 统计频率
    preferences[key].sort((a, b) => b.count - a.count);
    
    await this.setLongTerm('preferences', preferences);
  }

  /**
   * 获取记忆统计
   */
  getStats() {
    return {
      shortTerm: this.shortTerm.length,
      longTerm: Object.keys(this.longTerm || {}).length
    };
  }

  /**
   * 获取完整上下文（用于AI调用）
   */
  async getContext(query = '', options = {}) {
    const { shortTermLimit = 5, mediumTermDays = 3 } = options;
    
    return {
      // 最近对话
      recentMessages: this.getShortTerm(shortTermLimit),
      
      // 相关历史（简化版，实际可做语义检索）
      relatedHistory: await this.getMediumTerm(mediumTermDays),
      
      // 用户偏好
      preferences: await this.getLongTerm('preferences')
    };
  }
}

module.exports = MemoryManager;
