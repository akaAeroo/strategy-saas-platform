/**
 * 标题生成 Skill
 * 基于商品信息生成营销标题
 */

const BaseSkill = require('./BaseSkill');

class TitleGenerationSkill extends BaseSkill {
  constructor(agentId) {
    super({
      id: 'title_generation',
      name: '标题生成',
      description: '基于商品信息生成吸引点击的营销标题',
      icon: '✨',
      agentId,
      inputSchema: {
        productName: { type: 'string', required: true },
        category: { type: 'string', required: false },
        price: { type: 'number', required: false },
        features: { type: 'array', required: false },
        platform: { type: 'string', required: false },
        count: { type: 'number', required: false, default: 3 }
      },
      outputSchema: {
        titles: { type: 'array' },
        scores: { type: 'object' },
        tags: { type: 'array' }
      }
    });

    // 标题模板库
    this.templates = {
      discount: [
        '🔥限时特惠！{product}立省{discount}元',
        '⚡最后{time}小时！{product}超值优惠',
        '💥{product}爆款直降{discount}元，手慢无！'
      ],
      quality: [
        '💎{feature}，{product}让你秒变女神',
        '✨{product}，{feature}的秘密武器',
        '🌟口碑爆款！{product}，{feature}首选'
      ],
      urgency: [
        '⏰库存告急！{product}仅剩{count}件',
        '🚨最后{count}件！{product}抢完即止',
        '🔥{product}卖爆了！再不抢就没了'
      ],
      social: [
        '👑{count}万人已购！{product}为什么这么火',
        '💯好评率{percent}！{product}凭什么这么牛',
        '🎁回购率{percent}！{product}用了都说好'
      ]
    };

    // 平台优化规则
    this.platformRules = {
      taobao: { maxLength: 30, emojis: true, hotwords: ['爆款', '包邮', '正品'] },
      jd: { maxLength: 40, emojis: true, hotwords: ['自营', '次日达', '品质'] },
      pdd: { maxLength: 30, emojis: true, hotwords: ['百亿补贴', '拼团', '低价'] },
      xhs: { maxLength: 20, emojis: true, hotwords: ['种草', '必买', '宝藏'] },
      douyin: { maxLength: 25, emojis: true, hotwords: ['爆款', '直播', '福利'] }
    };
  }

  async execute(input, context = {}) {
    const startTime = Date.now();
    
    try {
      const {
        productName,
        category = '通用',
        price,
        features = [],
        platform = 'taobao',
        count = 3
      } = input;

      const titles = [];
      const rules = this.platformRules[platform] || this.platformRules.taobao;

      // 生成不同类型标题
      const templates = this.getTemplatesForCategory(category);
      
      for (let i = 0; i < count; i++) {
        const templateType = Object.keys(templates)[i % Object.keys(templates).length];
        const templateList = templates[templateType];
        const template = templateList[Math.floor(Math.random() * templateList.length)];
        
        const title = this.fillTemplate(template, {
          product: productName,
          feature: features[0] || '高品质',
          discount: price ? Math.floor(price * 0.2) : 50,
          time: Math.floor(Math.random() * 12) + 1,
          count: Math.floor(Math.random() * 100) + 10,
          percent: Math.floor(Math.random() * 20) + 80
        });

        // 平台优化
        const optimizedTitle = this.optimizeForPlatform(title, rules);
        
        titles.push({
          text: optimizedTitle,
          type: templateType,
          score: this.scoreTitle(optimizedTitle, rules),
          tags: this.extractTags(optimizedTitle)
        });
      }

      // 按评分排序
      titles.sort((a, b) => b.score - a.score);

      this.recordExecution(Date.now() - startTime);

      return {
        titles: titles.map(t => t.text),
        details: titles,
        platform,
        suggestions: this.generateSuggestions(titles, platform)
      };

    } catch (error) {
      throw new Error(`标题生成失败: ${error.message}`);
    }
  }

  getTemplatesForCategory(category) {
    const categoryTemplates = {
      beauty: { ...this.templates.quality, ...this.templates.social },
      electronics: { ...this.templates.discount, ...this.templates.quality },
      food: { ...this.templates.urgency, ...this.templates.social },
      fashion: { ...this.templates.quality, ...this.templates.urgency }
    };
    
    return categoryTemplates[category] || this.templates;
  }

  fillTemplate(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] || match);
  }

  optimizeForPlatform(title, rules) {
    let optimized = title;
    
    // 截断长度
    if (optimized.length > rules.maxLength) {
      optimized = optimized.slice(0, rules.maxLength - 3) + '...';
    }

    return optimized;
  }

  scoreTitle(title, rules) {
    let score = 50;
    
    // 长度评分
    if (title.length >= 15 && title.length <= rules.maxLength) score += 20;
    
    //  emoji 评分
    if (/[\u{1F300}-\u{1F9FF}]/u.test(title)) score += 15;
    
    // 数字评分（吸引注意）
    if (/\d/.test(title)) score += 10;
    
    // 热点词评分
    rules.hotwords.forEach(word => {
      if (title.includes(word)) score += 5;
    });

    return Math.min(score, 100);
  }

  extractTags(title) {
    const allTags = ['促销', '爆款', '新品', '限量', '好评', '热卖'];
    return allTags.filter(tag => title.includes(tag) || Math.random() > 0.5).slice(0, 2);
  }

  generateSuggestions(titles, platform) {
    return [
      `针对${platform}平台优化，建议添加平台专属热词`,
      'A/B测试建议：使用不同类型标题测试点击率',
      '可结合用户画像进一步优化个性化标题'
    ];
  }
}

module.exports = TitleGenerationSkill;
