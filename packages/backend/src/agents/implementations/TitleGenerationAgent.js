/**
 * 标题生成 Agent
 * 基于商品信息生成营销标题
 */

const BaseAgent = require('../BaseAgent');
const { getAgentSkills } = require('../skills');

class TitleGenerationAgent extends BaseAgent {
  constructor() {
    super({
      id: 'title_generation',
      name: '标题生成',
      description: '基于商品信息生成高转化营销标题',
      icon: '✨',
      color: '#f59e0b',
      category: 'content'
    });

    this.skills = getAgentSkills(this.id);
    this.skillMap = {};
    for (const skill of this.skills) {
      this.skillMap[skill.id] = skill;
    }
  }

  canHandle(input) {
    const keywords = ['标题', '商品', 'Listing', '电商', '淘宝', '京东', '天猫'];
    return keywords.some(kw => (input.question || '').includes(kw)) ? 0.95 : 0.3;
  }

  getCapabilitiesDescription() {
    return `- 生成商品营销标题
- 关键词提取优化
- 多平台适配
- A/B测试变体
- 合规性检查`;
  }

  async *execute(input, context = {}) {
    let hasSentContent = false;
    const { question, product, platform, style } = input;

    // 生成标题
    if (question?.includes('标题') || question?.includes('生成') || product) {
      yield { type: 'content', data: '✨ 正在使用AI生成营销标题...\n\n' };
      hasSentContent = true;
      
      try {
        const systemPrompt = `你是一位资深电商文案专家，擅长撰写高点击率的商品标题。
要求：
1. 标题要突出产品卖点，吸引用户点击
2. 符合平台规范（淘宝/京东/天猫/拼多多）
3. 禁止使用"第一"、"最"、"独家"等绝对化用语
4. 重要信息前置（前20字）
5. 控制长度在30-60字
6. 使用【】突出核心卖点
7. 可适当使用表情符号增加吸引力
8. 生成5个不同风格的标题供选择`;

        const prompt = `请为以下商品生成营销标题：

商品信息：
${JSON.stringify(product || {
  name: '无线蓝牙耳机',
  brand: 'TechPro',
  category: '数码配件',
  features: ['降噪', '长续航', '防水'],
  benefits: ['HiFi音质', '30小时续航'],
  discount: '7折',
  origin: '国产'
}, null, 2)}

目标平台：${platform || '淘宝'}
风格：${style || '促销'}

请生成：
1. 5个不同风格的商品标题
2. 每个标题给出评分（满分100）和评分理由
3. 标注每个标题的亮点和适用场景
4. 给出优化建议`;

        for await (const chunk of this.callLLM(systemPrompt, [{ role: 'user', content: prompt }])) {
          yield { type: 'content', data: chunk };
        }
        
        yield { type: 'content', data: '\n\n' };

      } catch (error) {
        yield { type: 'error', data: `标题生成失败：${error.message}` };
      }
    }

    // A/B测试
    if (question?.includes('A/B') || question?.includes('测试')) {
      yield {
        type: 'content',
        data: `**🧪 A/B 测试方案**\n\n` +
              `为了找到最优标题，建议进行以下测试：\n\n` +
              `**对照组（A）**：使用当前标题\n` +
              `**实验组（B）**：使用生成的优化标题\n\n` +
              `**测试指标**：\n` +
              `• 点击率（CTR）\n` +
              `• 转化率（CVR）\n` +
              `• 收藏加购率\n\n` +
              `**测试周期**：建议 7-14 天\n` +
              `**流量分配**：50% : 50%\n` +
              `**置信度**：95%\n\n` +
              `达到统计显著性后，自动应用表现更好的版本。\n`
      };
    }

    // 关键词优化建议
    if (question?.includes('关键词') || question?.includes('优化')) {
      yield {
        type: 'content',
        data: `**🔑 关键词优化建议**\n\n` +
              `**核心词**（必须包含）：\n` +
              `• 品牌词：商品品牌\n` +
              `• 类目词：商品所属类目\n` +
              `• 属性词：规格、材质等\n\n` +
              `**流量词**（提升曝光）：\n` +
              `• 热搜词：结合当前热点\n` +
              `• 长尾词：精准用户搜索\n` +
              `• 竞品词：借鉴竞品用词\n\n` +
              `**转化词**（促进点击）：\n` +
              `• 促销词：限时、特惠、秒杀\n` +
              `• 品质词：正品、旗舰、升级\n` +
              `• 情感词：爆款、热销、推荐\n\n` +
              `**排版建议**：\n` +
              `• 使用【】突出核心卖点\n` +
              `• 重要信息前置（前20字）\n` +
              `• 控制长度在30-50字\n`
      };
    }

    // 默认回复
    if (!hasSentContent) {
      yield {
        type: 'content',
        data: `你好！我是标题生成助手，可以帮助你：

✨ **标题生成**
• 基于商品信息生成营销标题
• 多平台适配（淘宝、京东、天猫、拼多多）
• 智能关键词提取

🧪 **A/B 测试**
• 生成多个标题变体
• 评分和优化建议
• 合规性检查

💡 **使用方法**
1. 输入"生成标题"创建商品标题
2. 输入"关键词优化"获取优化建议
3. 输入"A/B测试"设计测试方案

有什么可以帮你的吗？`
      };
    }

    await this.recordConversation(question || '生成标题', '标题生成完成', { important: true });
    yield { type: 'complete', data: { success: true } };
  }

  getQuickActions() {
    return [
      { label: '✨ 生成标题', prompt: '生成商品营销标题' },
      { label: '🔑 关键词优化', prompt: '分析关键词优化建议' },
      { label: '🧪 A/B测试', prompt: '设计标题A/B测试方案' },
      { label: '📊 竞品分析', prompt: '分析竞品标题策略' }
    ];
  }
}

module.exports = TitleGenerationAgent;
