/**
 * 标题生成 Skill
 * 基于商品信息生成营销标题
 */

const BaseSkill = require('../BaseSkill');

class TitleGenerationSkill extends BaseSkill {
  constructor(agentId) {
    super({
      id: 'title_generation',
      name: '标题生成',
      description: '基于商品信息生成营销标题',
      icon: '✨',
      category: 'content',
      agentId,
      inputSchema: {
        product: { type: 'object', required: true },
        platform: { type: 'string', required: false },
        style: { type: 'string', required: false },
        count: { type: 'number', required: false }
      },
      outputSchema: {
        titles: { type: 'array' },
        keywords: { type: 'array' },
        scores: { type: 'object' }
      }
    });

    // 标题模板
    this.templates = {
      promotional: [
        '【{discount}折】{brand} {product} {benefit}',
        '{product} {feature} 限时{discount}折 {urgency}',
        '【{emoji}爆款】{product} {benefit} 已售{sales}件',
        '{brand} {product} {feature} 买即送{gift}'
      ],
      informative: [
        '{brand} {product} {spec} {feature} 正品保障',
        '{product} {use_case} {benefit} {warranty}',
        '【{certification}】{product} {feature} {origin}'
      ],
      emotional: [
        '{emoji} 有了这款{product}，{scenario}不再是问题！',
        '后悔没早买！{product} {benefit} 真的太值了{emoji}',
        '{target}都在用的{product}，{benefit} 超{adjective}'
      ]
    };

    // 平台限制
    this.platformLimits = {
      taobao: { maxLength: 60, forbiddenWords: ['第一', '最'] },
      jd: { maxLength: 50, forbiddenWords: ['国家级', '最高级'] },
      tmall: { maxLength: 60, forbiddenWords: ['独家', '首创'] },
      pdd: { maxLength: 40, forbiddenWords: ['绝对', '永远'] }
    };

    // 热门修饰词
    this.modifiers = {
      quality: ['正品', '旗舰', '升级', '新款', '经典'],
      benefit: ['包邮', '速发', '质保', '无忧退换', '假一赔十'],
      urgency: ['限量', '秒杀', '今日特惠', '最后100件'],
      emoji: ['🔥', '⭐', '💎', '🎁', '✨', '💯']
    };
  }

  async execute(input, context = {}) {
    const startTime = Date.now();
    
    const {
      product,
      platform = 'taobao',
      style = 'promotional',
      count = 5
    } = input;

    const results = {
      titles: [],
      keywords: [],
      analysis: {},
      recommendations: []
    };

    // 提取关键词
    results.keywords = this.extractKeywords(product);

    // 生成标题
    const templates = this.templates[style] || this.templates.promotional;
    
    for (let i = 0; i < count; i++) {
      const template = templates[i % templates.length];
      const title = this.generateTitleFromTemplate(template, product, platform, i);
      
      const scored = {
        text: title,
        ...this.scoreTitle(title, product, platform)
      };
      
      results.titles.push(scored);
    }

    // 按分数排序
    results.titles.sort((a, b) => b.score - a.score);

    // 生成分析
    results.analysis = this.analyzeTitles(results.titles, product);

    // 生成建议
    results.recommendations = this.generateRecommendations(results, platform);

    this.recordExecution(Date.now() - startTime);

    return results;
  }

  extractKeywords(product) {
    const keywords = [];
    
    // 基础关键词
    if (product.name) {
      keywords.push(...product.name.split(/[\s\/]+/).filter(w => w.length >= 2));
    }
    
    // 品牌词
    if (product.brand) {
      keywords.push({ word: product.brand, type: 'brand', weight: 10 });
    }
    
    // 属性词
    if (product.attributes) {
      for (const [key, value] of Object.entries(product.attributes)) {
        if (typeof value === 'string') {
          keywords.push({ word: value, type: 'attribute', weight: 5 });
        }
      }
    }
    
    // 类目词
    if (product.category) {
      keywords.push({ word: product.category, type: 'category', weight: 8 });
    }
    
    // 功能词
    if (product.features) {
      for (const feature of product.features) {
        keywords.push({ word: feature, type: 'feature', weight: 6 });
      }
    }

    return keywords;
  }

  generateTitleFromTemplate(template, product, platform, index) {
    const limit = this.platformLimits[platform] || this.platformLimits.taobao;
    
    // 模板变量替换
    let title = template
      .replace('{brand}', product.brand || '')
      .replace('{product}', product.name || '')
      .replace('{feature}', product.features?.[0] || this.modifiers.quality[index % this.modifiers.quality.length])
      .replace('{benefit}', product.benefits?.[0] || this.modifiers.benefit[index % this.modifiers.benefit.length])
      .replace('{discount}', product.discount || ['5', '6', '7', '8'][index % 4])
      .replace('{sales}', product.sales || Math.floor(Math.random() * 9000 + 1000).toString())
      .replace('{urgency}', this.modifiers.urgency[index % this.modifiers.urgency.length])
      .replace('{emoji}', this.modifiers.emoji[index % this.modifiers.emoji.length])
      .replace('{spec}', product.specifications?.[0] || '')
      .replace('{use_case}', product.useCases?.[0] || '日常使用')
      .replace('{warranty}', product.warranty || '质保一年')
      .replace('{certification}', product.certifications?.[0] || '官方认证')
      .replace('{origin}', product.origin || '')
      .replace('{gift}', product.gift || '好礼')
      .replace('{scenario}', product.scenarios?.[0] || '')
      .replace('{target}', product.targetAudience || '达人')
      .replace('{adjective}', ['好用', '划算', '实用', '省心'][index % 4]);

    // 清理多余空格
    title = title.replace(/\s+/g, ' ').trim();
    
    // 检查长度限制
    if (title.length > limit.maxLength) {
      title = title.substring(0, limit.maxLength - 3) + '...';
    }

    // 检查禁用词
    for (const word of limit.forbiddenWords) {
      if (title.includes(word)) {
        title = title.replace(word, '*'.repeat(word.length));
      }
    }

    return title;
  }

  scoreTitle(title, product, platform) {
    let score = 60; // 基础分
    const factors = [];

    // 长度得分
    const limit = this.platformLimits[platform]?.maxLength || 60;
    const lengthRatio = title.length / limit;
    if (lengthRatio > 0.8 && lengthRatio <= 1) {
      score += 10;
      factors.push({ factor: 'length', score: 10, reason: '长度适中' });
    } else if (lengthRatio < 0.5) {
      score -= 5;
      factors.push({ factor: 'length', score: -5, reason: '标题过短' });
    }

    // 关键词覆盖
    let keywordCoverage = 0;
    if (product.brand && title.includes(product.brand)) keywordCoverage += 20;
    if (product.name && title.includes(product.name.split(' ')[0])) keywordCoverage += 15;
    if (product.category && title.includes(product.category)) keywordCoverage += 15;
    
    score += keywordCoverage * 0.3;
    factors.push({ factor: 'keywords', score: keywordCoverage * 0.3, reason: `关键词覆盖度 ${keywordCoverage}%` });

    // 卖点突出
    const sellingPoints = ['折', '包邮', '送', '新品', '限量', '爆款'];
    const hasSellingPoint = sellingPoints.some(sp => title.includes(sp));
    if (hasSellingPoint) {
      score += 10;
      factors.push({ factor: 'selling_point', score: 10, reason: '包含卖点词' });
    }

    // 情感词
    const emotionalWords = ['🔥', '⭐', '💎', '！'];
    const hasEmotional = emotionalWords.some(ew => title.includes(ew));
    if (hasEmotional) {
      score += 5;
      factors.push({ factor: 'emotional', score: 5, reason: '有情感元素' });
    }

    // 可读性
    if (title.includes('【') && title.includes('】')) {
      score += 5;
      factors.push({ factor: 'readability', score: 5, reason: '结构清晰' });
    }

    return {
      score: Math.min(100, Math.round(score)),
      factors,
      length: title.length,
      compliance: this.checkCompliance(title, platform)
    };
  }

  checkCompliance(title, platform) {
    const limit = this.platformLimits[platform] || this.platformLimits.taobao;
    const issues = [];

    // 检查禁用词
    for (const word of limit.forbiddenWords) {
      if (title.includes(word)) {
        issues.push({
          type: 'forbidden_word',
          word,
          severity: 'high',
          suggestion: `避免使用"${word}"`
        });
      }
    }

    // 检查特殊字符
    const specialChars = title.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/g);
    if (specialChars && specialChars.join('').length > 5) {
      issues.push({
        type: 'special_chars',
        severity: 'medium',
        suggestion: '减少特殊字符使用'
      });
    }

    return {
      passed: issues.filter(i => i.severity === 'high').length === 0,
      issues
    };
  }

  analyzeTitles(titles, product) {
    const scores = titles.map(t => t.score);
    
    return {
      averageScore: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      commonPatterns: this.extractCommonPatterns(titles),
      lengthDistribution: {
        short: titles.filter(t => t.length < 30).length,
        medium: titles.filter(t => t.length >= 30 && t.length < 50).length,
        long: titles.filter(t => t.length >= 50).length
      }
    };
  }

  extractCommonPatterns(titles) {
    const patterns = [];
    const bracketPattern = titles.filter(t => t.text.includes('【'));
    const emojiPattern = titles.filter(t => /[\u{1F300}-\u{1F9FF}]/u.test(t.text));
    const discountPattern = titles.filter(t => /\d折/.test(t.text));

    if (bracketPattern.length > titles.length * 0.5) {
      patterns.push('大量使用【】强调');
    }
    if (emojiPattern.length > 0) {
      patterns.push('使用表情符号');
    }
    if (discountPattern.length > 0) {
      patterns.push('突出折扣信息');
    }

    return patterns;
  }

  generateRecommendations(results, platform) {
    const recommendations = [];
    const limit = this.platformLimits[platform] || this.platformLimits.taobao;

    if (results.analysis.averageScore < 70) {
      recommendations.push({
        type: 'improvement',
        priority: 'high',
        message: '标题整体质量偏低，建议增加品牌词和卖点词'
      });
    }

    const lowCompliance = results.titles.filter(t => !t.compliance?.passed);
    if (lowCompliance.length > 0) {
      recommendations.push({
        type: 'compliance',
        priority: 'high',
        message: `${lowCompliance.length} 个标题存在合规问题，请检查禁用词`
      });
    }

    if (results.analysis.lengthDistribution.long > results.titles.length * 0.5) {
      recommendations.push({
        type: 'length',
        priority: 'medium',
        message: `标题普遍较长，建议控制在 ${limit.maxLength} 字以内`
      });
    }

    return recommendations;
  }
}

module.exports = TitleGenerationSkill;
