/**
 * 网页搜索 Skill
 * 网页抓取和全网搜索
 */

const BaseSkill = require('./BaseSkill');
const webSearchService = require('../services/webSearchService');

class WebSearchSkill extends BaseSkill {
  constructor() {
    super({
      id: 'web_search',
      name: '网页搜索',
      description: '搜索网络信息或抓取特定网页内容',
      icon: '🌐',
      category: 'research',
      tags: ['搜索', '网页', '信息', '抓取'],
      inputSchema: {
        query: { type: 'string', required: false, description: '搜索关键词' },
        url: { type: 'string', required: false, description: '网页 URL' },
        deepSearch: { type: 'boolean', required: false, description: '是否深度搜索' }
      },
      outputSchema: {
        results: { type: 'array', description: '搜索结果' },
        summary: { type: 'string', description: 'AI 总结' }
      }
    });
  }

  async initialize() {
    await super.initialize();
    console.log('[WebSearchSkill] 初始化完成');
  }

  /**
   * 检查是否可以处理此输入
   */
  canHandle(input) {
    let score = 0;

    // 如果是 URL，高置信度
    if (input.url || (input.query && this.isURL(input.query))) {
      score += 0.95;
    }

    // 如果有搜索关键词
    if (input.query) {
      score += 0.7;
    }

    // 如果问题包含搜索相关词
    if (input.question) {
      const keywords = ['搜索', '查找', '了解', '什么是', '为什么', '怎么样', '最新', '趋势'];
      if (keywords.some(k => input.question.includes(k))) {
        score += 0.3;
      }
    }

    return Math.min(score, 1);
  }

  /**
   * 判断是否为 URL
   */
  isURL(str) {
    if (!str) return false;
    return /^https?:\/\/.+/i.test(str) || /^[\w-]+\.[\w-]+/.test(str);
  }

  /**
   * 执行网页搜索
   */
  async *execute(input, context = {}) {
    try {
      const query = input.query || input.question;
      const url = input.url || (this.isURL(query) ? query : null);

      // 如果是单个 URL，抓取网页
      if (url) {
        yield { type: 'status', data: { status: 'fetching', url } };

        // 先抓取
        const fetchResult = await webSearchService.fetchWebPage(url);
        
        if (!fetchResult.success) {
          yield { type: 'error', data: `抓取失败: ${fetchResult.error}` };
          return;
        }

        yield {
          type: 'status',
          data: {
            status: 'analyzing',
            title: fetchResult.title,
            contentLength: fetchResult.contentLength
          }
        };

        // AI 分析
        const searchData = {
          success: true,
          query: url,
          searchResults: [{
            title: fetchResult.title,
            url: fetchResult.url,
            snippet: fetchResult.description
          }],
          fetchedPages: [fetchResult]
        };

        const stream = webSearchService.analyzeStream(url, searchData, input.question);
        
        for await (const chunk of stream) {
          yield chunk;
        }

        yield {
          type: 'complete',
          data: {
            source: 'web_fetch',
            url: fetchResult.url,
            title: fetchResult.title
          }
        };

      } else if (query) {
        // 全网搜索
        yield { type: 'status', data: { status: 'searching', query } };

        const searchResult = await webSearchService.deepSearch(query, 5, 3);

        if (!searchResult.success) {
          yield { type: 'error', data: `搜索失败: ${searchResult.error}` };
          return;
        }

        yield {
          type: 'status',
          data: {
            status: 'analyzing',
            resultCount: searchResult.searchResults.length,
            fetchedCount: searchResult.fetchedPages.length
          }
        };

        // AI 分析搜索结果
        const stream = webSearchService.analyzeStream(query, searchResult, input.question);
        
        for await (const chunk of stream) {
          yield chunk;
        }

        yield {
          type: 'complete',
          data: {
            source: 'web_search',
            query,
            results: searchResult.searchResults
          }
        };

      } else {
        yield { type: 'error', data: '请提供搜索关键词或网页 URL' };
      }

    } catch (error) {
      console.error('[WebSearchSkill] 执行错误:', error);
      yield { type: 'error', data: error.message };
    }
  }
}

module.exports = WebSearchSkill;
