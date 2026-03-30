/**
 * 网页抓取 Skill
 * 抓取网页内容并提取信息
 */

const BaseSkill = require('../BaseSkill');
const axios = require('axios');
const cheerio = require('cheerio');

class WebScrapeSkill extends BaseSkill {
  constructor(agentId) {
    super({
      id: 'web_scrape',
      name: '网页抓取',
      description: '抓取网页内容并提取结构化信息',
      icon: '🕷️',
      agentId,
      inputSchema: {
        url: { type: 'string', required: true },
        selector: { type: 'string', required: false },
        extractType: { type: 'string', required: false } // 'text', 'html', 'links', 'table'
      },
      outputSchema: {
        title: { type: 'string' },
        content: { type: 'string' },
        links: { type: 'array' },
        metadata: { type: 'object' }
      }
    });
  }

  async execute(input, context = {}) {
    const startTime = Date.now();
    
    try {
      const { url, selector, extractType = 'text' } = input;
      
      // 抓取网页
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
        }
      });

      const $ = cheerio.load(response.data);
      const result = {
        url,
        title: $('title').text().trim(),
        metadata: {
          description: $('meta[name="description"]').attr('content'),
          keywords: $('meta[name="keywords"]').attr('content'),
          scrapedAt: new Date().toISOString()
        }
      };

      // 根据提取类型获取内容
      switch (extractType) {
        case 'text':
          result.content = this.extractText($, selector);
          break;
        case 'links':
          result.links = this.extractLinks($, url);
          break;
        case 'table':
          result.tables = this.extractTables($);
          break;
        case 'html':
          result.content = selector ? $(selector).html() : $.html();
          break;
        default:
          result.content = this.extractText($, selector);
      }

      this.recordExecution(Date.now() - startTime);

      return result;

    } catch (error) {
      throw new Error(`网页抓取失败: ${error.message}`);
    }
  }

  extractText($, selector) {
    if (selector) {
      return $(selector).text().trim();
    }
    
    // 智能提取正文
    $('script, style, nav, header, footer, .ads').remove();
    
    const selectors = ['article', 'main', '.content', '.post', '#content'];
    for (const sel of selectors) {
      const text = $(sel).text().trim();
      if (text.length > 200) {
        return text.slice(0, 5000);
      }
    }
    
    return $('body').text().trim().slice(0, 5000);
  }

  extractLinks($, baseUrl) {
    const links = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text) {
        try {
          const fullUrl = new URL(href, baseUrl).href;
          links.push({ url: fullUrl, text: text.slice(0, 100) });
        } catch {}
      }
    });
    return links.slice(0, 50);
  }

  extractTables($) {
    const tables = [];
    $('table').each((i, el) => {
      const tableData = [];
      $(el).find('tr').each((j, row) => {
        const rowData = [];
        $(row).find('td, th').each((k, cell) => {
          rowData.push($(cell).text().trim());
        });
        if (rowData.length > 0) {
          tableData.push(rowData);
        }
      });
      if (tableData.length > 0) {
        tables.push(tableData);
      }
    });
    return tables;
  }
}

module.exports = WebScrapeSkill;
