/**
 * 知识库系统
 * 支持本地文档索引和向量检索
 * 每个Agent拥有独立的知识库
 */

const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

class KnowledgeBase {
  constructor({ agentId, dataDir }) {
    this.agentId = agentId;
    this.dataDir = dataDir;
    this.indexPath = path.join(dataDir, 'index.json');
    this.documentsPath = path.join(dataDir, 'documents');
    
    // 简单内存索引（生产环境可用向量数据库）
    this.index = new Map();
    this.documents = new Map();
  }

  /**
   * 初始化知识库
   */
  async initialize() {
    await fs.ensureDir(this.dataDir);
    await fs.ensureDir(this.documentsPath);
    
    // 加载已有索引
    await this.loadIndex();
    
    // 自动构建索引（如果有新文档）
    await this.autoBuild();
    
    console.log(`[Knowledge:${this.agentId}] 初始化完成，共 ${this.documents.size} 个文档`);
  }

  /**
   * 加载索引
   */
  async loadIndex() {
    try {
      if (await fs.pathExists(this.indexPath)) {
        const data = await fs.readJson(this.indexPath);
        this.index = new Map(data.index || []);
        this.documents = new Map(data.documents || []);
      }
    } catch (error) {
      console.warn(`[Knowledge:${this.agentId}] 加载索引失败:`, error.message);
    }
  }

  /**
   * 保存索引
   */
  async saveIndex() {
    const data = {
      agentId: this.agentId,
      updatedAt: Date.now(),
      index: Array.from(this.index.entries()),
      documents: Array.from(this.documents.entries())
    };
    await fs.writeJson(this.indexPath, data);
  }

  /**
   * 自动构建索引
   */
  async autoBuild() {
    let files = [];
    try {
      const result = await glob('**/*', { 
        cwd: this.documentsPath,
        nodir: true 
      });
      files = Array.isArray(result) ? result : [];
    } catch (e) {
      files = [];
    }

    let hasNew = false;
    for (const file of files) {
      const docId = `doc_${Buffer.from(file).toString('base64')}`;
      
      if (!this.documents.has(docId)) {
        await this.indexDocument(file, docId);
        hasNew = true;
      }
    }

    if (hasNew) {
      await this.saveIndex();
    }
  }

  /**
   * 索引单个文档
   */
  async indexDocument(filePath, docId) {
    const fullPath = path.join(this.documentsPath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    // 解析文档
    let chunks = [];
    if (ext === '.json') {
      chunks = this.parseJSON(content);
    } else if (ext === '.md' || ext === '.txt') {
      chunks = this.parseText(content);
    } else {
      chunks = [{ content, type: 'text' }];
    }

    // 存储文档
    this.documents.set(docId, {
      id: docId,
      path: filePath,
      type: ext,
      chunks: chunks.length,
      updatedAt: Date.now()
    });

    // 建立索引（简化版：关键词匹配）
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `${docId}_chunk_${i}`;
      
      // 提取关键词
      const keywords = this.extractKeywords(chunk.content);
      
      this.index.set(chunkId, {
        docId,
        chunkIndex: i,
        content: chunk.content,
        keywords,
        metadata: chunk.metadata || {}
      });
    }

    console.log(`[Knowledge:${this.agentId}] 索引文档: ${filePath}`);
  }

  /**
   * 解析JSON文档
   */
  parseJSON(content) {
    try {
      const data = JSON.parse(content);
      return this.flattenJSON(data);
    } catch {
      return [{ content }];
    }
  }

  /**
   * 扁平化JSON对象
   */
  flattenJSON(obj, prefix = '') {
    const chunks = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        chunks.push(...this.flattenJSON(value, fullKey));
      } else {
        chunks.push({
          content: `${fullKey}: ${value}`,
          metadata: { key: fullKey }
        });
      }
    }
    
    return chunks;
  }

  /**
   * 解析文本文档
   */
  parseText(content) {
    // 按段落分割
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
    
    return paragraphs.map((p, i) => ({
      content: p.trim(),
      metadata: { paragraph: i }
    }));
  }

  /**
   * 提取关键词（简化版）
   */
  extractKeywords(text) {
    // 简单的关键词提取：中文词汇和英文单词
    const chineseWords = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const englishWords = text.match(/[a-zA-Z]{3,}/g) || [];
    
    return [...chineseWords, ...englishWords].slice(0, 20);
  }

  /**
   * 搜索知识库
   */
  async search(query, limit = 5) {
    const queryKeywords = this.extractKeywords(query);
    const scores = new Map();

    // 计算匹配分数
    for (const [chunkId, chunk] of this.index) {
      let score = 0;
      
      for (const keyword of queryKeywords) {
        // 关键词匹配
        if (chunk.keywords.some(k => k.includes(keyword) || keyword.includes(k))) {
          score += 1;
        }
        
        // 内容匹配
        if (chunk.content.includes(keyword)) {
          score += 0.5;
        }
      }

      if (score > 0) {
        scores.set(chunkId, score);
      }
    }

    // 排序并返回
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([chunkId, score]) => {
      const chunk = this.index.get(chunkId);
      const doc = this.documents.get(chunk.docId);
      
      return {
        id: chunkId,
        content: chunk.content,
        score,
        source: doc?.path || 'unknown',
        metadata: chunk.metadata
      };
    });
  }

  /**
   * 添加文档到知识库
   */
  async addDocument(filename, content) {
    const filePath = path.join(this.documentsPath, filename);
    await fs.writeFile(filePath, content);
    
    const docId = `doc_${Buffer.from(filename).toString('base64')}`;
    await this.indexDocument(filename, docId);
    await this.saveIndex();
    
    return docId;
  }

  /**
   * 获取知识库统计
   */
  getStats() {
    return {
      documents: this.documents.size,
      chunks: this.index.size
    };
  }

  /**
   * 获取所有文档
   */
  async listDocuments() {
    return Array.from(this.documents.values());
  }
}

module.exports = KnowledgeBase;
