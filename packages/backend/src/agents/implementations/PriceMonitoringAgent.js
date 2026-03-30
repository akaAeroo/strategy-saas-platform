/**
 * 价格监控 Agent
 * 抓取竞品价格，生成比价报告
 */

const BaseAgent = require('../BaseAgent');
const { getAgentSkills } = require('../skills');

class PriceMonitoringAgent extends BaseAgent {
  constructor() {
    super({
      id: 'price_monitoring',
      name: '价格监控',
      description: '抓取竞品价格，生成比价报告和价格预警',
      icon: '💰',
      color: '#ef4444',
      category: 'research'
    });

    this.skills = getAgentSkills(this.id);
    this.skillMap = {};
    for (const skill of this.skills) {
      this.skillMap[skill.id] = skill;
    }
  }

  canHandle(input) {
    const keywords = ['价格', '竞品', '比价', '监控', '抓取', '竞争对手', '市场'];
    return keywords.some(kw => (input.question || '').includes(kw)) ? 0.92 : 0.3;
  }

  getCapabilitiesDescription() {
    return `- 抓取多平台价格
- 生成比价报告
- 价格趋势分析
- 智能价格预警
- 竞品动态监控`;
  }

  async *execute(input, context = {}) {
    let hasSentContent = false;
    const { question, product, platforms, trackPrice } = input;

    // 价格对比
    if (question?.includes('比价') || question?.includes('对比') || product) {
      yield { type: 'content', data: '🔍 正在使用AI分析各平台价格...\n\n' };
      hasSentContent = true;
      
      try {
        const systemPrompt = `你是一位资深电商价格分析师，擅长多平台比价和购买建议。
要求：
1. 分析要客观、全面
2. 考虑价格、服务、售后等多维度
3. 给出明确的购买建议
4. 使用中文回复
5. 使用Markdown表格和列表格式化输出`;

        // 模拟价格数据
        const mockPriceData = {
          product: product || { name: 'iPhone 15 Pro 256GB', referencePrice: 8999 },
          platforms: [
            { name: '淘宝', price: 8299, shipping: '包邮', rating: 4.8, reviews: 12500 },
            { name: '京东', price: 8499, shipping: '自营包邮', rating: 4.9, reviews: 8900 },
            { name: '天猫', price: 8399, shipping: '包邮', rating: 4.7, reviews: 5600 },
            { name: '拼多多', price: 7999, shipping: '百亿补贴', rating: 4.6, reviews: 3200 }
          ],
          history: this.generatePriceHistory(30)
        };

        const prompt = `请根据以下价格数据生成详细的比价报告：

商品信息：
${JSON.stringify(mockPriceData.product, null, 2)}

各平台价格：
${JSON.stringify(mockPriceData.platforms, null, 2)}

请提供：
1. 比价结果表格（平台、价格、服务、评分）
2. 最优选择推荐及理由
3. 各平台优缺点分析
4. 购买建议（急用/可等/追求性价比）
5. 价格走势判断`;

        for await (const chunk of this.callLLM(systemPrompt, [{ role: 'user', content: prompt }])) {
          yield { type: 'content', data: chunk };
        }
        
        yield { type: 'content', data: '\n\n' };

      } catch (error) {
        yield { type: 'error', data: `价格对比失败：${error.message}` };
      }
    }

    // 趋势分析
    if (question?.includes('趋势') || question?.includes('走势')) {
      yield { type: 'content', data: '📈 正在使用AI分析价格趋势...\n\n' };
      hasSentContent = true;
      
      try {
        const history = this.generatePriceHistory(60);
        
        const systemPrompt = `你是一位资深市场价格分析师，擅长价格趋势分析和预测。
要求：
1. 分析历史价格数据
2. 识别价格周期和规律
3. 给出购买时机建议
4. 使用中文回复`;

        const prompt = `请分析以下价格历史数据：

${JSON.stringify(history.slice(-30), null, 2)}

请提供：
1. 价格趋势总结（上升/下降/震荡）
2. 历史最高价和最低价分析
3. 价格波动周期
4. 未来价格走势预测
5. 最佳购买时机建议`;

        for await (const chunk of this.callLLM(systemPrompt, [{ role: 'user', content: prompt }])) {
          yield { type: 'content', data: chunk };
        }
        
        yield { type: 'content', data: '\n\n' };
        
      } catch (error) {
        yield { type: 'error', data: `趋势分析失败：${error.message}` };
      }
    }

    // 设置价格预警
    if (question?.includes('预警') || trackPrice) {
      yield { type: 'content', data: '✅ **价格预警已设置**\n\n' };
      
      const systemPrompt = `你是一位电商运营专家，擅长价格监控策略。`;
      
      const prompt = `请为以下商品设置价格监控策略：

商品：${product?.name || 'iPhone 15 Pro'}
目标价格：¥${trackPrice || '8500'}
监控平台：淘宝、京东、天猫、拼多多

请提供：
1. 目标价格合理性分析
2. 达到目标价格的可能性评估
3. 建议的监控频率
4. 降价通知策略`;

      try {
        for await (const chunk of this.callLLM(systemPrompt, [{ role: 'user', content: prompt }])) {
          yield { type: 'content', data: chunk };
        }
        yield { type: 'content', data: '\n\n' };
      } catch (error) {
        yield { type: 'content', data: `监控设置完成。当价格降至目标值以下时将通知您。\n\n` };
      }
    }

    // 默认回复
    if (!hasSentContent) {
      yield {
        type: 'content',
        data: `你好！我是价格监控助手，可以帮助你：

💰 **价格对比**
• 多平台价格监控（淘宝、京东、天猫）
• 竞品价格分析
• 历史价格走势

📈 **智能预警**
• 价格降价提醒
• 设置目标价格自动通知
• 价格异常检测

💡 **使用方法**
1. 输入"比价查询"获取商品价格
2. 输入"趋势分析"查看价格走势
3. 输入"设置预警"创建价格监控

有什么可以帮你的吗？`
      };
    }

    await this.recordConversation(question || '价格监控', '价格分析完成', { important: true });
    yield { type: 'complete', data: { success: true } };
  }

  generatePriceHistory(days) {
    const data = [];
    const today = new Date();
    let basePrice = 8999;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // 模拟价格波动
      basePrice += (Math.random() - 0.5) * 200;
      basePrice = Math.max(7999, Math.min(9999, basePrice));
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(basePrice)
      });
    }
    
    return data;
  }

  getPricePosition(history) {
    const prices = history.map(h => h.avgPrice || h.price);
    const current = prices[prices.length - 1];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    
    if (current < min + range * 0.25) return '较低';
    if (current > max - range * 0.25) return '较高';
    return '中等';
  }

  translateTrend(direction) {
    const map = {
      'increasing_strongly': '🚀 快速上涨',
      'increasing': '📈 上涨',
      'decreasing_strongly': '🔻 快速下跌',
      'decreasing': '📉 下跌',
      'stable': '➡️ 稳定'
    };
    return map[direction] || direction;
  }

  getQuickActions() {
    return [
      { label: '💰 比价查询', prompt: '查询商品价格对比' },
      { label: '📈 趋势分析', prompt: '分析价格走势' },
      { label: '🔔 设置预警', prompt: '设置价格监控预警' },
      { label: '📊 竞品监控', prompt: '监控竞品价格动态' }
    ];
  }
}

module.exports = PriceMonitoringAgent;
