/**
 * 价格对比 Skill
 * 对比多个平台价格，生成比价报告
 */

const BaseSkill = require('../BaseSkill');
const WebScrapeSkill = require('./WebScrapeSkill');

class PriceCompareSkill extends BaseSkill {
  constructor(agentId) {
    super({
      id: 'price_compare',
      name: '价格对比',
      description: '对比多个平台价格，生成比价报告',
      icon: '⚖️',
      category: 'web',
      agentId,
      inputSchema: {
        product: { type: 'object', required: true },
        platforms: { type: 'array', required: false },
        includeHistory: { type: 'boolean', required: false }
      },
      outputSchema: {
        comparisons: { type: 'array' },
        bestDeal: { type: 'object' },
        history: { type: 'array' }
      }
    });

    // 支持的平台配置
    this.platforms = {
      taobao: {
        name: '淘宝',
        searchUrl: 'https://s.taobao.com/search?q={keyword}',
        priceSelectors: ['.price .num', '.price-current', '.realPrice'],
        nameSelectors: ['.title a', '.product-title']
      },
      jd: {
        name: '京东',
        searchUrl: 'https://search.jd.com/Search?keyword={keyword}',
        priceSelectors: ['.p-price .price', '.gl-price'],
        nameSelectors: ['.p-name a', '.gl-i-wrap .p-name']
      },
      tmall: {
        name: '天猫',
        searchUrl: 'https://list.tmall.com/search_product.htm?q={keyword}',
        priceSelectors: ['.c-price', '.ui-price'],
        nameSelectors: ['.product-title', '.product-name']
      },
      pdd: {
        name: '拼多多',
        searchUrl: 'http://mobile.yangkeduo.com/search_result.html?search_key={keyword}',
        priceSelectors: ['.price', '.goods-price']
      }
    };

    this.webScrapeSkill = new WebScrapeSkill(agentId);
  }

  async execute(input, context = {}) {
    const startTime = Date.now();
    
    const {
      product,
      platforms = ['taobao', 'jd', 'tmall'],
      includeHistory = false
    } = input;

    const results = {
      comparisons: [],
      bestDeal: null,
      history: [],
      timestamp: new Date().toISOString()
    };

    // 收集各平台价格
    for (const platformId of platforms) {
      const platform = this.platforms[platformId];
      if (!platform) continue;

      try {
        const priceInfo = await this.scrapePlatformPrice(platform, product);
        results.comparisons.push({
          platform: platformId,
          platformName: platform.name,
          ...priceInfo
        });
      } catch (error) {
        results.comparisons.push({
          platform: platformId,
          platformName: platform.name,
          error: error.message,
          available: false
        });
      }
    }

    // 找出最优价格
    results.bestDeal = this.findBestDeal(results.comparisons);

    // 计算统计信息
    results.statistics = this.calculateStatistics(results.comparisons);

    // 生成建议
    results.recommendations = this.generateRecommendations(results);

    // 模拟历史数据
    if (includeHistory) {
      results.history = this.generateMockHistory(product);
    }

    this.recordExecution(Date.now() - startTime);

    return results;
  }

  async scrapePlatformPrice(platform, product) {
    // 实际实现中应该调用 WebScrapeSkill
    // 这里模拟返回数据
    
    const basePrice = product.referencePrice || 100;
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
    const price = Math.round(basePrice * randomFactor * 100) / 100;
    
    // 模拟促销信息
    const hasPromotion = Math.random() > 0.5;
    const promotionPrice = hasPromotion ? price * 0.9 : null;
    
    return {
      productName: product.name,
      price,
      promotionPrice: promotionPrice ? Math.round(promotionPrice * 100) / 100 : null,
      currency: 'CNY',
      url: platform.searchUrl.replace('{keyword}', encodeURIComponent(product.name)),
      available: true,
      inStock: Math.random() > 0.1,
      rating: (3.5 + Math.random() * 1.5).toFixed(1),
      reviewCount: Math.floor(Math.random() * 10000),
      shipping: Math.random() > 0.7 ? '免运费' : `运费 ¥${(Math.random() * 20).toFixed(2)}`,
      promotionInfo: hasPromotion ? ['满减', '店铺券'][Math.floor(Math.random() * 2)] : null,
      scrapedAt: new Date().toISOString()
    };
  }

  findBestDeal(comparisons) {
    const validComparisons = comparisons.filter(c => c.available && !c.error);
    
    if (validComparisons.length === 0) return null;

    // 按实际支付价格排序
    const sorted = validComparisons.sort((a, b) => {
      const priceA = a.promotionPrice || a.price;
      const priceB = b.promotionPrice || b.price;
      return priceA - priceB;
    });

    const best = sorted[0];
    const secondBest = sorted[1];

    return {
      platform: best.platform,
      platformName: best.platformName,
      price: best.promotionPrice || best.price,
      originalPrice: best.price,
      savings: secondBest ? ((secondBest.promotionPrice || secondBest.price) - (best.promotionPrice || best.price)).toFixed(2) : 0,
      savingsPercent: secondBest ? 
        (((secondBest.promotionPrice || secondBest.price) - (best.promotionPrice || best.price)) / (secondBest.promotionPrice || secondBest.price) * 100).toFixed(1) : 0,
      url: best.url,
      reason: this.generateBestDealReason(best)
    };
  }

  generateBestDealReason(deal) {
    const reasons = [];
    
    if (deal.promotionPrice) {
      reasons.push('当前有促销');
    }
    if (deal.shipping === '免运费') {
      reasons.push('免运费');
    }
    if (deal.rating && parseFloat(deal.rating) > 4.5) {
      reasons.push('高评分');
    }
    
    return reasons.length > 0 ? reasons.join('，') : '价格最低';
  }

  calculateStatistics(comparisons) {
    const validPrices = comparisons
      .filter(c => c.available && !c.error)
      .map(c => c.promotionPrice || c.price);
    
    if (validPrices.length === 0) return null;

    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    const avg = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;

    return {
      lowest: min,
      highest: max,
      average: Math.round(avg * 100) / 100,
      spread: ((max - min) / avg * 100).toFixed(1),
      platformCount: validPrices.length
    };
  }

  generateRecommendations(results) {
    const recommendations = [];

    if (results.bestDeal) {
      if (parseFloat(results.bestDeal.savingsPercent) > 10) {
        recommendations.push({
          type: 'action',
          priority: 'high',
          message: `建议在${results.bestDeal.platformName}购买，可节省${results.bestDeal.savingsPercent}%`
        });
      }
    }

    const highPriceVariance = results.comparisons.filter(c => {
      if (!c.available || c.error) return false;
      const price = c.promotionPrice || c.price;
      return price > results.statistics.average * 1.2;
    });

    if (highPriceVariance.length > 0) {
      recommendations.push({
        type: 'insight',
        priority: 'medium',
        message: '不同平台价格差异较大，建议仔细比价'
      });
    }

    // 价格趋势建议
    if (results.history && results.history.length > 0) {
      const recent = results.history.slice(-7);
      const trend = recent[recent.length - 1].avgPrice - recent[0].avgPrice;
      
      if (trend < -0.05) {
        recommendations.push({
          type: 'timing',
          priority: 'medium',
          message: '近期价格呈下降趋势，如不急需可继续观望'
        });
      } else if (trend > 0.05) {
        recommendations.push({
          type: 'urgency',
          priority: 'high',
          message: '价格近期上涨，建议尽快购买'
        });
      }
    }

    return recommendations;
  }

  generateMockHistory(product) {
    const history = [];
    const basePrice = product.referencePrice || 100;
    const today = new Date();

    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // 模拟价格波动
      const randomFactor = 0.9 + Math.random() * 0.2;
      const weekendFactor = (date.getDay() === 0 || date.getDay() === 6) ? 0.95 : 1;
      
      history.push({
        date: date.toISOString().split('T')[0],
        avgPrice: Math.round(basePrice * randomFactor * weekendFactor * 100) / 100,
        minPrice: Math.round(basePrice * randomFactor * weekendFactor * 0.9 * 100) / 100,
        maxPrice: Math.round(basePrice * randomFactor * weekendFactor * 1.1 * 100) / 100
      });
    }

    return history;
  }
}

module.exports = PriceCompareSkill;
