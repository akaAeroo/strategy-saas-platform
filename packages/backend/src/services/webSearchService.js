/**
 * Web Search Skill
 * 支持网页抓取和全网搜索
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { config } = require('../config');

class WebSearchService {
  constructor() {
    // 搜索 API 配置（可选）
    this.searchConfig = {
      // SerpAPI (Google 搜索)
      serpApi: {
        key: process.env.SERPAPI_KEY || '',
        url: 'https://serpapi.com/search'
      },
      // Bing Search API
      bing: {
        key: process.env.BING_SEARCH_KEY || '',
        endpoint: process.env.BING_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/search'
      }
    };
  }

  /**
   * 系统提示词 - 网络搜索分析师
   */
  getSystemPrompt() {
    return `你是智能策略平台的 Web Search 分析师，擅长从网络信息中提取有价值的洞察。

## 核心能力
1. **网页内容抓取**：提取网页正文、标题、关键信息
2. **信息摘要**：将长文浓缩为要点
3. **数据提取**：从网页中提取结构化数据
4. **竞品分析**：分析竞品网站信息
5. **趋势洞察**：基于搜索结果识别行业趋势

## 输出规范
- 使用 Markdown 格式
- 关键信息用 **加粗** 标注
- 列出信息来源
- 对不确定的信息标注"[需核实]"
- 提供数据来源链接

## 引用格式
- 使用 [^1^], [^2^] 标注引用来源
- 在回复末尾列出所有引用链接

## 注意事项
- 尊重 robots.txt 和网站使用条款
- 不抓取需要登录的内容
- 对敏感信息进行处理`;
  }

  /**
   * 抓取单个网页内容
   * @param {string} url - 网页 URL
   * @returns {Promise<Object>} 抓取结果
   */
  async fetchWebPage(url) {
    try {
      console.log('抓取网页:', url);
      
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
        },
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      // 提取标题
      const title = $('title').text().trim() || 
                    $('h1').first().text().trim() || 
                    '无标题';
      
      // 提取描述
      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         '';
      
      // 提取正文（智能选择主要内容区域）
      let content = '';
      
      // 尝试常见的内容选择器
      const contentSelectors = [
        'article',
        'main',
        '.content',
        '.post-content',
        '.article-content',
        '#content',
        '.entry-content',
        '[role="main"]'
      ];
      
      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim().length > 200) {
          content = element.text().trim();
          break;
        }
      }
      
      // 如果没有找到主要内容，使用 body
      if (!content) {
        // 移除脚本、样式、导航等
        $('script, style, nav, header, footer, aside, .ads, .comments').remove();
        content = $('body').text().trim();
      }
      
      // 清理文本
      content = this._cleanText(content);
      
      // 提取链接
      const links = [];
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        if (href && text && links.length < 10) {
          const absoluteUrl = new URL(href, url).href;
          links.push({ url: absoluteUrl, text: text.slice(0, 100) });
        }
      });

      return {
        success: true,
        url,
        title: title.slice(0, 200),
        description: description.slice(0, 500),
        content: content.slice(0, 10000), // 限制长度
        contentLength: content.length,
        links: links.slice(0, 10),
        fetchedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('抓取失败:', error.message);
      return {
        success: false,
        url,
        error: error.message,
        fetchedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 搜索引擎查询
   * @param {string} query - 搜索关键词
   * @param {number} limit - 结果数量
   * @returns {Promise<Object>} 搜索结果
   */
  async search(query, limit = 5) {
    console.log('搜索:', query);

    // 优先使用 Bing API
    if (this.searchConfig.bing.key) {
      return this._searchBing(query, limit);
    }
    
    // 其次使用 SerpAPI
    if (this.searchConfig.serpApi.key) {
      return this._searchSerpApi(query, limit);
    }

    // 没有配置 API，返回提示
    return {
      success: false,
      query,
      error: '未配置搜索引擎 API',
      message: '请配置 BING_SEARCH_KEY 或 SERPAPI_KEY 环境变量以启用搜索功能',
      results: []
    };
  }

  /**
   * Bing 搜索
   */
  async _searchBing(query, limit = 5) {
    try {
      const response = await axios.get(
        this.searchConfig.bing.endpoint,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.searchConfig.bing.key
          },
          params: {
            q: query,
            count: limit,
            mkt: 'zh-CN'
          }
        }
      );

      const results = response.data.webPages?.value?.map(item => ({
        title: item.name,
        url: item.url,
        snippet: item.snippet,
        date: item.dateLastCrawled
      })) || [];

      return {
        success: true,
        query,
        engine: 'bing',
        results,
        totalResults: response.data.webPages?.totalEstimatedMatches || 0
      };

    } catch (error) {
      console.error('Bing 搜索失败:', error.message);
      return {
        success: false,
        query,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * SerpAPI (Google) 搜索
   */
  async _searchSerpApi(query, limit = 5) {
    try {
      const response = await axios.get(this.searchConfig.serpApi.url, {
        params: {
          q: query,
          api_key: this.searchConfig.serpApi.key,
          engine: 'google',
          num: limit,
          hl: 'zh-CN'
        }
      });

      const results = response.data.organic_results?.map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        date: item.date
      })) || [];

      return {
        success: true,
        query,
        engine: 'google',
        results,
        totalResults: response.data.search_information?.organic_results_state || 0
      };

    } catch (error) {
      console.error('SerpAPI 搜索失败:', error.message);
      return {
        success: false,
        query,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * 深度搜索：搜索 + 抓取内容
   * @param {string} query - 搜索关键词
   * @param {number} searchLimit - 搜索结果数
   * @param {number} fetchLimit - 抓取网页数
   */
  async deepSearch(query, searchLimit = 5, fetchLimit = 3) {
    // 1. 先搜索
    const searchResult = await this.search(query, searchLimit);
    
    if (!searchResult.success || searchResult.results.length === 0) {
      return {
        success: false,
        query,
        error: searchResult.error || '未找到搜索结果',
        searchResults: searchResult.results || []
      };
    }

    // 2. 抓取前 N 个网页内容
    const fetchPromises = searchResult.results
      .slice(0, fetchLimit)
      .map(result => this.fetchWebPage(result.url));
    
    const fetchedPages = await Promise.all(fetchPromises);
    const successfulFetches = fetchedPages.filter(p => p.success);

    return {
      success: true,
      query,
      searchResults: searchResult.results,
      fetchedPages: successfulFetches,
      failedUrls: fetchedPages.filter(p => !p.success).map(p => p.url),
      summary: {
        searchCount: searchResult.results.length,
        fetchedCount: successfulFetches.length,
        totalContentLength: successfulFetches.reduce((sum, p) => sum + (p.contentLength || 0), 0)
      }
    };
  }

  /**
   * AI 流式分析搜索结果
   */
  async *analyzeStream(query, searchData, userQuestion = null) {
    const prompt = this._buildAnalysisPrompt(query, searchData, userQuestion);
    
    try {
      const aiProvider = config.ai.provider;
      const aiConfig = config.ai[aiProvider];

      const requestBody = {
        model: aiConfig.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
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
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('AI 分析失败:', error);
      yield { type: 'error', data: error.message };
    }
  }

  /**
   * 构建分析 Prompt
   */
  _buildAnalysisPrompt(query, searchData, userQuestion) {
    let prompt = `请分析以下网络搜索信息：\n\n`;
    prompt += `## 搜索关键词\n${query}\n\n`;

    // 添加搜索结果摘要
    if (searchData.searchResults) {
      prompt += `## 搜索结果（${searchData.searchResults.length} 条）\n\n`;
      searchData.searchResults.forEach((result, i) => {
        prompt += `${i + 1}. **${result.title}**\n`;
        prompt += `   URL: ${result.url}\n`;
        prompt += `   摘要: ${result.snippet?.slice(0, 200) || '无摘要'}\n\n`;
      });
    }

    // 添加抓取的网页内容
    if (searchData.fetchedPages && searchData.fetchedPages.length > 0) {
      prompt += `## 详细网页内容\n\n`;
      searchData.fetchedPages.forEach((page, i) => {
        prompt += `### [${i + 1}] ${page.title}\n`;
        prompt += `来源: ${page.url}\n`;
        prompt += `内容:\n${page.content.slice(0, 3000)}\n\n`;
        if (page.content.length > 3000) {
          prompt += `...(内容已截断，原长度 ${page.content.length} 字符)\n\n`;
        }
      });
    }

    // 用户问题
    if (userQuestion) {
      prompt += `\n## 用户问题\n${userQuestion}\n`;
    } else {
      prompt += `\n## 任务\n请基于以上搜索结果：\n`;
      prompt += `1. 总结关键信息点\n`;
      prompt += `2. 提取有价值的洞察\n`;
      prompt += `3. 如有数据，进行整理分析\n`;
      prompt += `4. 给出信息来源引用\n`;
    }

    return prompt;
  }

  /**
   * 清理文本
   */
  _cleanText(text) {
    return text
      .replace(/\s+/g, ' ')           // 合并多个空格
      .replace(/\n+/g, '\n')          // 合并多个换行
      .replace(/\t+/g, ' ')           // 制表符转空格
      .replace(/[\u200B-\u200D]/g, '') // 移除零宽字符
      .trim();
  }
}

module.exports = new WebSearchService();
