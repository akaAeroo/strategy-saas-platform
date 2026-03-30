/**
 * 网页抓取 Skill
 * 抓取网页内容
 */

const BaseSkill = require('./BaseSkill');
const axios = require('axios');
const cheerio = require('cheerio');

class WebScrapeSkill extends BaseSkill {
  constructor(agentId) {
    super({
      id: 'web_scrape',
      name: '网页抓取',
      description: '抓取网页内容并提取信息',
      icon: '🕷️',
      agentId,
      inputSchema: {
        url: { type: 'string', required: true },
        selector: { type: 'string', required: false }
      },
      outputSchema: {
        title: { type: 'string' },
        content: { type: 'string' },
        links: { type: 'array' }
      }
    });
  }

  async execute(input, context = {}) {
    const startTime = Date.now();
    
    try {
      const { url, selector } = input;
      
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
        }
      });

      const $ = cheerio.load(response.data);
      
      // 清理无用元素
      $('script, style, nav, header, footer, .ads').remove();

      const result = {
        url,
        title: $('title').text().trim(),
        description: $('meta[name="description"]').attr('content'),
        content: this.extractContent($, selector),
        links: this.extractLinks($, url)
      };

      this.recordExecution(Date.now() - startTime);
      return result;

    } catch (error) {
      throw new Error(`抓取失败: ${error.message}`);
    }
  }

  extractContent($, selector) {
    if (selector) {
      return $(selector).text().trim().slice(0, 5000);
    }
    
    // 智能提取
    const selectors = ['article', 'main', '.content', '.post'];
    for (const sel of selectors) {
      const text = $(sel).text().trim();
      if (text.length > 200) return text.slice(0, 5000);
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
    return links.slice(0, 20);
  }
}

module.exports = WebScrapeSkill;
