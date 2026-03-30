/**
 * 趋势分析 Skill
 * 分析人群数据趋势，检测变化和异常
 */

const BaseSkill = require('../BaseSkill');

class TrendAnalysisSkill extends BaseSkill {
  constructor(agentId) {
    super({
      id: 'trend_analysis',
      name: '趋势分析',
      description: '分析人群数据趋势，检测变化和异常',
      icon: '📈',
      category: 'analysis',
      agentId,
      inputSchema: {
        timeSeries: { type: 'array', required: true },
        metrics: { type: 'array', required: true },
        windowSize: { type: 'number', required: false }
      },
      outputSchema: {
        trends: { type: 'array' },
        anomalies: { type: 'array' },
        forecast: { type: 'object' }
      }
    });
  }

  async execute(input, context = {}) {
    const startTime = Date.now();
    
    const { timeSeries, metrics, windowSize = 7 } = input;
    
    const results = {
      trends: [],
      anomalies: [],
      forecast: {},
      summary: {}
    };

    for (const metric of metrics) {
      const values = timeSeries.map(d => ({
        date: d.date,
        value: Number(d[metric]) || 0
      }));

      // 计算趋势
      const trend = this.calculateTrend(values, windowSize);
      results.trends.push({
        metric,
        ...trend
      });

      // 检测异常
      const anomalies = this.detectAnomalies(values, metric);
      results.anomalies.push(...anomalies);

      // 简单预测
      results.forecast[metric] = this.forecast(values, 7);
    }

    // 生成汇总
    results.summary = this.generateSummary(results.trends, results.anomalies);

    this.recordExecution(Date.now() - startTime);

    return results;
  }

  calculateTrend(values, windowSize) {
    if (values.length < windowSize * 2) {
      return { direction: 'insufficient_data', change: 0 };
    }

    const recent = values.slice(-windowSize);
    const previous = values.slice(-windowSize * 2, -windowSize);
    
    const recentAvg = recent.reduce((a, b) => a + b.value, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b.value, 0) / previous.length;
    
    const change = previousAvg === 0 ? 0 : ((recentAvg - previousAvg) / previousAvg) * 100;
    
    // 计算移动平均
    const ma = [];
    for (let i = windowSize - 1; i < values.length; i++) {
      const sum = values.slice(i - windowSize + 1, i + 1).reduce((a, b) => a + b.value, 0);
      ma.push(sum / windowSize);
    }

    // 判断趋势方向
    let direction = 'stable';
    if (change > 10) direction = 'increasing_strongly';
    else if (change > 5) direction = 'increasing';
    else if (change < -10) direction = 'decreasing_strongly';
    else if (change < -5) direction = 'decreasing';

    // 计算波动率
    const volatility = this.calculateVolatility(values.map(v => v.value));

    return {
      direction,
      change: Number(change.toFixed(2)),
      recentAverage: Number(recentAvg.toFixed(2)),
      previousAverage: Number(previousAvg.toFixed(2)),
      volatility: Number(volatility.toFixed(2)),
      movingAverage: ma.slice(-5).map(v => Number(v.toFixed(2)))
    };
  }

  calculateVolatility(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return (Math.sqrt(variance) / mean) * 100;
  }

  detectAnomalies(values, metric) {
    const anomalies = [];
    const nums = values.map(v => v.value);
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const stdDev = Math.sqrt(
      nums.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / nums.length
    );

    const threshold = 2.5 * stdDev;

    values.forEach((v, i) => {
      const deviation = Math.abs(v.value - mean);
      if (deviation > threshold) {
        anomalies.push({
          date: v.date,
          metric,
          value: v.value,
          expected: Number(mean.toFixed(2)),
          deviation: Number((v.value - mean).toFixed(2)),
          severity: deviation > 3 * stdDev ? 'high' : 'medium'
        });
      }
    });

    return anomalies;
  }

  forecast(values, days) {
    if (values.length < 7) {
      return { error: 'Insufficient data for forecasting' };
    }

    const nums = values.map(v => v.value);
    
    // 简单线性回归
    const n = nums.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = nums.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * nums[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 生成预测
    const forecast = [];
    const lastDate = new Date(values[values.length - 1].date);
    
    for (let i = 1; i <= days; i++) {
      const predicted = slope * (n + i - 1) + intercept;
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        value: Number(Math.max(0, predicted).toFixed(2)),
        confidence: Number((1 - i / (days * 2)).toFixed(2))
      });
    }

    return {
      values: forecast,
      trend: slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'stable',
      slope: Number(slope.toFixed(4))
    };
  }

  generateSummary(trends, anomalies) {
    const increasing = trends.filter(t => t.direction.includes('increasing'));
    const decreasing = trends.filter(t => t.direction.includes('decreasing'));
    const highVolatility = trends.filter(t => t.volatility > 50);
    
    return {
      totalMetrics: trends.length,
      increasing: increasing.length,
      decreasing: decreasing.length,
      stable: trends.length - increasing.length - decreasing.length,
      highVolatility: highVolatility.length,
      anomalyCount: anomalies.length,
      healthScore: this.calculateHealthScore(trends, anomalies)
    };
  }

  calculateHealthScore(trends, anomalies) {
    let score = 100;
    
    // 扣分项
    const decreasingStrongly = trends.filter(t => t.direction === 'decreasing_strongly').length;
    score -= decreasingStrongly * 15;
    
    const highVolatility = trends.filter(t => t.volatility > 50).length;
    score -= highVolatility * 10;
    
    score -= Math.min(anomalies.length * 5, 30);
    
    // 加分项
    const increasingStrongly = trends.filter(t => t.direction === 'increasing_strongly').length;
    score += increasingStrongly * 5;
    
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = TrendAnalysisSkill;
