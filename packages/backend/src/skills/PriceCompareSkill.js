/**
 * 价格对比 Skill
 * 对比多个平台价格
 */

const BaseSkill = require('./BaseSkill');

class PriceCompareSkill extends BaseSkill {
  constructor(agentId) {
    super({
      id: 'price_compare',
      name: '价格对比',
      description: '对比多个平台商品价格',
      icon: '⚖️',
      agentId,
      inputSchema: {
        prices: { type: 'array', required: true },
        productName: { type: 'string', required: false }
      },
      outputSchema: {
        bestDeal: { type: 'object' },
        comparison: { type: 'array' },
        savings: { type: 'number' }
      }
    });
  }

  async execute(input, context = {}) {
    const startTime = Date.now();
    
    try {
      const { prices, productName = '商品' } = input;
      
      if (!Array.isArray(prices) || prices.length === 0) {
        throw new Error('价格数据不能为空');
      }

      // 排序并找出最优
      const sorted = prices
        .map(p => ({ ...p, priceNum: this.parsePrice(p.price) }))
        .sort((a, b) => a.priceNum - b.priceNum);

      const bestDeal = sorted[0];
      const highest = sorted[sorted.length - 1];
      const savings = highest.priceNum - bestDeal.priceNum;

      // 生成对比分析
      const comparison = sorted.map((item, index) => ({
        ...item,
        rank: index + 1,
        diff: index === 0 ? 0 : item.priceNum - bestDeal.priceNum,
        diffPercent: index === 0 ? 0 : 
          (((item.priceNum - bestDeal.priceNum) / bestDeal.priceNum) * 100).toFixed(1)
      }));

      this.recordExecution(Date.now() - startTime);

      return {
        productName,
        bestDeal,
        comparison,
        savings,
        savingsPercent: ((savings / highest.priceNum) * 100).toFixed(1),
        analysis: this.generateAnalysis(productName, comparison)
      };

    } catch (error) {
      throw new Error(`价格对比失败: ${error.message}`);
    }
  }

  parsePrice(price) {
    if (typeof price === 'number') return price;
    const match = String(price).replace(/[^\d.]/g, '');
    return parseFloat(match) || 0;
  }

  generateAnalysis(productName, comparison) {
    const best = comparison[0];
    const worst = comparison[comparison.length - 1];
    
    return {
      summary: `${productName}在${best.platform}价格最优，为${best.price}`,
      recommendation: comparison.length > 1 
        ? `建议选择${best.platform}，可节省${worst.diff}元`
        : '价格数据充足，建议直接购买',
      trend: comparison.length > 2 
        ? `价格差异${((worst.diff / best.priceNum) * 100).toFixed(0)}%，建议比价购买`
        : '价格相对稳定'
    };
  }
}

module.exports = PriceCompareSkill;
