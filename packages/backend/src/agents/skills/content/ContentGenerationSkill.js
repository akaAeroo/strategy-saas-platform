/**
 * 内容生成 Skill
 * 生成营销文案、Push、短信等内容
 */

const BaseSkill = require('../BaseSkill');

class ContentGenerationSkill extends BaseSkill {
  constructor(agentId) {
    super({
      id: 'content_generation',
      name: '内容生成',
      description: '生成营销文案、Push、短信等内容',
      icon: '✍️',
      category: 'content',
      agentId,
      inputSchema: {
        contentType: { type: 'string', required: true }, // 'push', 'sms', 'email', 'in-app'
        goal: { type: 'string', required: true },
        targetAudience: { type: 'object', required: false },
        productInfo: { type: 'object', required: false },
        tone: { type: 'string', required: false },
        constraints: { type: 'object', required: false }
      },
      outputSchema: {
        contents: { type: 'array' },
        variants: { type: 'array' }
      }
    });

    // 内容模板库
    this.templates = {
      push: {
        promotional: {
          title: '{{emoji}} {{highlight}}',
          body: '{{hook}} {{benefit}} {{cta}}',
          examples: [
            { emoji: '🎉', highlight: '限时特惠', hook: '您关注的商品降价了！', benefit: '现在购买立省{{discount}}元', cta: '点击查看 >>' },
            { emoji: '⏰', highlight: '最后24小时', hook: '优惠活动即将结束', benefit: '全场{{discount}}折起', cta: '立即抢购' }
          ]
        },
        reactivation: {
          title: '{{emoji}} 好久不见',
          body: '{{greeting}} {{incentive}} {{cta}}',
          examples: [
            { emoji: '👋', greeting: '想您了！为您准备了专属回归礼', incentive: '登录即送{{reward}}', cta: '立即领取' }
          ]
        },
        transactional: {
          title: '{{emoji}} {{event}}',
          body: '{{info}} {{action}}',
          examples: [
            { emoji: '📦', event: '订单已发货', info: '您的订单{{orderId}}已发货', action: '点击查看物流' }
          ]
        }
      },
      sms: {
        promotional: [
          '【{{brand}}】{{emoji}} {{highlight}}！{{benefit}}，戳 {{shortUrl}} 抢购，回TD退订',
          '【{{brand}}】{{greeting}}，{{offer}}，限时{{hours}}小时！{{shortUrl}} 回TD退'
        ],
        otp: [
          '【{{brand}}】您的验证码是{{code}}，{{minutes}}分钟内有效。如非本人操作请忽略。'
        ]
      }
    };

    // 语气风格
    this.tones = {
      professional: { emoji: false, formal: true, punctuation: 'standard' },
      friendly: { emoji: true, formal: false, punctuation: 'casual' },
      urgent: { emoji: true, formal: false, punctuation: 'exclamation', urgency: true },
      luxury: { emoji: false, formal: true, punctuation: 'minimal', elegant: true }
    };
  }

  async execute(input, context = {}) {
    const startTime = Date.now();
    
    const {
      contentType,
      goal,
      targetAudience = {},
      productInfo = {},
      tone = 'friendly',
      constraints = {}
    } = input;

    const results = {
      contents: [],
      variants: [],
      metadata: {
        contentType,
        tone,
        targetSize: targetAudience.size || 'unknown'
      }
    };

    // 生成主内容
    const mainContent = this.generateContent({
      contentType,
      goal,
      targetAudience,
      productInfo,
      tone,
      constraints
    });
    results.contents.push(mainContent);

    // 生成变体（A/B测试用）
    const variants = this.generateVariants(mainContent, 2);
    results.variants.push(...variants);

    // 添加个性化变体
    if (targetAudience.segments) {
      for (const segment of targetAudience.segments) {
        const personalized = this.personalizeContent(mainContent, segment);
        results.variants.push({
          ...personalized,
          targetSegment: segment.name,
          personalizationType: 'segment'
        });
      }
    }

    this.recordExecution(Date.now() - startTime);

    return results;
  }

  generateContent({ contentType, goal, targetAudience, productInfo, tone, constraints }) {
    const toneConfig = this.tones[tone] || this.tones.friendly;
    
    let content = {
      type: contentType,
      goal,
      tone
    };

    switch (contentType) {
      case 'push':
        content = {
          ...content,
          ...this.generatePushNotification({ goal, productInfo, toneConfig, constraints })
        };
        break;
        
      case 'sms':
        content = {
          ...content,
          ...this.generateSMS({ goal, productInfo, toneConfig, constraints })
        };
        break;
        
      case 'email':
        content = {
          ...content,
          ...this.generateEmail({ goal, productInfo, toneConfig, constraints })
        };
        break;
        
      case 'in-app':
        content = {
          ...content,
          ...this.generateInAppMessage({ goal, productInfo, toneConfig, constraints })
        };
        break;
    }

    // 合规检查
    content.compliance = this.checkCompliance(content, contentType);
    
    // 评分
    content.score = this.scoreContent(content, { goal, targetAudience });

    return content;
  }

  generatePushNotification({ goal, productInfo, toneConfig, constraints }) {
    const maxLength = constraints.maxLength || 60;
    
    let title, body;
    
    if (goal.includes('promo') || goal.includes('discount')) {
      const template = this.templates.push.promotional.examples[0];
      title = `${template.emoji} ${template.highlight}`;
      body = template.body
        .replace('{{hook}}', productInfo.highlight || '超值优惠！')
        .replace('{{benefit}}', productInfo.discount ? `低至${productInfo.discount}折` : '限时特惠')
        .replace('{{cta}}', '立即查看');
    } else if (goal.includes('reactivate')) {
      const template = this.templates.push.reactivation.examples[0];
      title = `${template.emoji} ${title}`;
      body = `${template.greeting} ${template.incentive.replace('{{reward}}', productInfo.reward || '专属优惠')}`;
    } else {
      title = toneConfig.emoji ? '🔔 新消息' : '新消息';
      body = productInfo.description || '点击查看详情';
    }

    // 截断到限制长度
    if (body.length > maxLength) {
      body = body.substring(0, maxLength - 3) + '...';
    }

    return {
      title: title.substring(0, 20),
      body,
      badge: 1,
      sound: 'default',
      actionButtons: [
        { id: 'view', title: '查看' },
        { id: 'dismiss', title: '忽略' }
      ]
    };
  }

  generateSMS({ goal, productInfo, toneConfig, constraints }) {
    const templates = this.templates.sms.promotional;
    let template = templates[Math.floor(Math.random() * templates.length)];
    
    let message = template
      .replace('{{brand}}', productInfo.brand || '品牌')
      .replace('{{emoji}}', toneConfig.emoji ? ['🎉', '⏰', '🔥'][Math.floor(Math.random() * 3)] : '')
      .replace('{{highlight}}', productInfo.highlight || '特惠活动')
      .replace('{{benefit}}', productInfo.benefit || '超值优惠')
      .replace('{{greeting}}', '尊敬的用户')
      .replace('{{offer}}', productInfo.offer || '限时优惠')
      .replace('{{hours}}', productInfo.hours || '24')
      .replace('{{shortUrl}}', productInfo.shortUrl || '[链接]');

    // 确保长度符合短信限制
    if (message.length > 70) {
      message = message.substring(0, 67) + '...';
    }

    return {
      message,
      encoding: message.length > 70 ? 'ucs2' : 'gsm7',
      segments: Math.ceil(message.length / 70)
    };
  }

  generateEmail({ goal, productInfo, toneConfig, constraints }) {
    return {
      subject: `${toneConfig.emoji ? '🎉 ' : ''}${productInfo.highlight || '您有一封新邮件'}`,
      preheader: productInfo.description || '点击查看详情',
      body: {
        greeting: toneConfig.formal ? '尊敬的客户' : '您好',
        headline: productInfo.headline || productInfo.highlight,
        content: productInfo.description || '',
        cta: {
          text: productInfo.ctaText || '立即查看',
          url: productInfo.ctaUrl || '#'
        },
        footer: {
          unsubscribe: true,
          company: productInfo.brand || ''
        }
      }
    };
  }

  generateInAppMessage({ goal, productInfo, toneConfig, constraints }) {
    return {
      type: goal.includes('promo') ? 'banner' : 'modal',
      title: productInfo.highlight || '温馨提示',
      message: productInfo.description || '',
      image: productInfo.imageUrl,
      cta: {
        text: productInfo.ctaText || '了解详情',
        action: productInfo.ctaAction || 'navigate'
      },
      dismissible: true,
      displayDuration: goal.includes('urgent') ? 0 : 5000
    };
  }

  generateVariants(content, count) {
    const variants = [];
    
    for (let i = 0; i < count; i++) {
      const variant = { ...content };
      
      // 生成变体：调整CTA、语气等
      if (content.body) {
        const ctas = ['立即查看', '了解更多', '马上抢购', '点击查看'];
        variant.body = content.body.replace(/立即查看|了解更多|马上抢购|点击查看/g, ctas[i % ctas.length]);
      }
      
      variant.variantId = `v${i + 1}`;
      variant.variantType = i === 0 ? 'control' : 'test';
      variants.push(variant);
    }
    
    return variants;
  }

  personalizeContent(content, segment) {
    const personalized = { ...content };
    
    // 根据人群特征调整内容
    if (segment.characteristics) {
      if (segment.characteristics.includes('price_sensitive')) {
        if (personalized.body) {
          personalized.body = '💰 ' + personalized.body;
        }
      }
      if (segment.characteristics.includes('new_user')) {
        personalized.title = '🎁 新人专享：' + (personalized.title || '');
      }
    }
    
    return personalized;
  }

  checkCompliance(content, contentType) {
    const issues = [];
    
    // 检查敏感词
    const sensitiveWords = ['最', '第一', '国家级', '独家'];
    const text = JSON.stringify(content).toLowerCase();
    
    for (const word of sensitiveWords) {
      if (text.includes(word)) {
        issues.push({
          type: 'sensitive_word',
          word,
          severity: 'warning',
          suggestion: `避免使用"${word}"等绝对化用语`
        });
      }
    }
    
    // 检查退订信息（短信/邮件）
    if ((contentType === 'sms' || contentType === 'email') && !text.includes('退订')) {
      issues.push({
        type: 'missing_unsubscribe',
        severity: 'error',
        suggestion: '必须包含退订方式'
      });
    }
    
    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }

  scoreContent(content, { goal, targetAudience }) {
    let score = 70; // 基础分
    
    // 长度合适度
    const text = JSON.stringify(content);
    if (text.length < 50) score += 5;
    if (text.length > 200) score -= 10;
    
    // CTA 清晰度
    if (text.includes('查看') || text.includes('点击')) score += 5;
    
    // 个性化程度
    if (content.personalized) score += 10;
    
    // 合规性
    if (content.compliance?.passed) score += 10;
    else score -= content.compliance?.issues?.length * 5 || 0;
    
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = ContentGenerationSkill;
