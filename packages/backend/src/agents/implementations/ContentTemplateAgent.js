/**
 * 触达内容 Agent
 * 生成短信/Push/站内信内容
 */

const BaseAgent = require('../BaseAgent');
const { getAgentSkills } = require('../skills');

class ContentTemplateAgent extends BaseAgent {
  constructor() {
    super({
      id: 'content_template',
      name: '触达内容',
      description: '生成短信/Push/站内信等营销内容',
      icon: '💬',
      color: '#8b5cf6',
      category: 'content'
    });

    this.skills = getAgentSkills(this.id);
    this.skillMap = {};
    for (const skill of this.skills) {
      this.skillMap[skill.id] = skill;
    }
  }

  canHandle(input) {
    const keywords = ['内容', '文案', '推送', '短信', 'Push', '站内信', '营销', '触达'];
    return keywords.some(kw => (input.question || '').includes(kw)) ? 0.92 : 0.3;
  }

  getCapabilitiesDescription() {
    return `- 生成短信文案
- 创建Push通知
- 编写站内信内容
- 支持A/B测试变体
- 个性化内容推荐`;
  }

  async *execute(input, context = {}) {
    let hasSentContent = false;
    const { question, contentType, goal, productInfo, targetAudience } = input;

    // 生成内容
    if (question?.includes('生成') || question?.includes('创建') || contentType) {
      const type = contentType || this.detectContentType(question);
      const campaignGoal = goal || this.detectGoal(question);
      
      yield { type: 'content', data: `✍️ 正在使用AI生成${this.translateType(type)}内容...\n\n` };
      hasSentContent = true;
      
      try {
        const systemPrompt = `你是一位资深营销文案专家，擅长撰写高转化率的营销文案。
要求：
1. 文案要突出产品卖点，吸引目标用户
2. 符合平台调性和规范（禁止使用"第一"、"最"等绝对化用语）
3. 语言简洁有力，避免夸大和虚假宣传
4. 使用中文回复
5. 根据内容类型控制长度：
   - Push通知：标题≤20字，内容≤60字
   - 短信：≤70字（含签名）
   - 邮件：主题≤50字
6. 生成3个不同风格的版本供选择`;

        const prompt = `请为以下产品生成${this.translateType(type)}营销文案：

产品信息：
${JSON.stringify(productInfo || {
  name: '夏季新品',
  highlight: '限时特惠',
  discount: '5折',
  brand: '品牌名'
}, null, 2)}

营销目标：${campaignGoal === 'reactivation' ? '用户召回' : campaignGoal === 'promotional' ? '促销推广' : '通知提醒'}
目标受众：${targetAudience?.description || '普通消费者'}

请生成：
1. 3个不同风格的文案版本
2. 每个版本包含标题和正文
3. 简要说明每个版本的亮点和适用场景
4. 给出A/B测试建议`;

        for await (const chunk of this.callLLM(systemPrompt, [{ role: 'user', content: prompt }])) {
          yield { type: 'content', data: chunk };
        }
        
        yield { type: 'content', data: '\n\n' };

      } catch (error) {
        yield { type: 'error', data: `内容生成失败：${error.message}` };
      }
    }

    // 生成标题（复用title_generation skill）
    if (question?.includes('标题')) {
      yield { type: 'content', data: '✨ 正在生成营销标题...\n\n' };
      
      try {
        const titleSkill = this.skillMap['title_generation'];
        
        if (titleSkill) {
          const result = await titleSkill.execute({
            product: {
              name: '夏季新品T恤',
              brand: '时尚品牌',
              category: '服装',
              discount: '5',
              features: ['透气', '舒适'],
              benefits: ['限时5折', '包邮']
            },
            platform: 'taobao',
            style: 'promotional',
            count: 5
          });

          yield { type: 'content', data: `**生成的标题**（按评分排序）\n\n` };
          
          for (let i = 0; i < result.titles.length; i++) {
            const title = result.titles[i];
            yield {
              type: 'content',
              data: `${i + 1}. ${title.text}\n` +
                    `   评分：${title.score}/100 | 长度：${title.length}字\n\n`
            };
          }

          if (result.recommendations.length > 0) {
            yield {
              type: 'content',
              data: `💡 **优化建议：**\n${result.recommendations.map(r => `- ${r.message}`).join('\n')}\n\n`
            };
          }
        }
      } catch (error) {
        yield { type: 'error', data: `标题生成失败：${error.message}` };
      }
    }

    // 默认回复
    if (!hasSentContent) {
      yield {
        type: 'content',
        data: `你好！我是触达内容助手，可以帮助你：

💬 **内容生成**
• 生成 Push 推送文案
• 编写短信营销内容
• 创建邮件模板

✨ **标题生成**
• 商品营销标题
• 多平台适配（淘宝、京东、天猫）
• A/B 测试变体

💡 **使用方法**
1. 输入"生成Push"创建推送内容
2. 输入"生成短信"编写短信文案
3. 输入"生成标题"获取商品标题建议

有什么可以帮你的吗？`
      };
    }

    await this.recordConversation(question || '生成内容', '内容生成完成', { important: true });
    yield { type: 'complete', data: { success: true } };
  }

  detectContentType(question) {
    if (!question) return 'push';
    if (question.includes('Push') || question.includes('推送')) return 'push';
    if (question.includes('短信') || question.includes('SMS')) return 'sms';
    if (question.includes('邮件') || question.includes('Email')) return 'email';
    if (question.includes('站内信')) return 'in-app';
    return 'push';
  }

  detectGoal(question) {
    if (!question) return 'promotional';
    if (question.includes('促活') || question.includes('召回')) return 'reactivation';
    if (question.includes('促销') || question.includes('优惠')) return 'promotional';
    if (question.includes('通知')) return 'transactional';
    return 'promotional';
  }

  translateType(type) {
    const map = {
      'push': 'Push推送',
      'sms': '短信',
      'email': '邮件',
      'in-app': '站内信'
    };
    return map[type] || type;
  }

  getQuickActions() {
    return [
      { label: '💬 生成Push', prompt: '生成Push推送内容' },
      { label: '📱 生成短信', prompt: '生成短信文案' },
      { label: '✨ 生成标题', prompt: '生成商品营销标题' },
      { label: '🎯 个性化推荐', prompt: '生成个性化营销内容' }
    ];
  }
}

module.exports = ContentTemplateAgent;
