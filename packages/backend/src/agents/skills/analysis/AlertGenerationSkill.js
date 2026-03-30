/**
 * 预警生成 Skill
 * 基于规则和阈值生成数据预警
 */

const BaseSkill = require('../BaseSkill');

class AlertGenerationSkill extends BaseSkill {
  constructor(agentId) {
    super({
      id: 'alert_generation',
      name: '预警生成',
      description: '基于规则和阈值生成数据预警',
      icon: '⚠️',
      category: 'analysis',
      agentId,
      inputSchema: {
        data: { type: 'object', required: true },
        rules: { type: 'array', required: false },
        checkInterval: { type: 'string', required: false }
      },
      outputSchema: {
        alerts: { type: 'array' },
        summary: { type: 'object' }
      }
    });

    // 默认预警规则
    this.defaultRules = [
      { metric: 'conversion_rate', threshold: 0.02, operator: 'lt', severity: 'high', message: '转化率低于2%' },
      { metric: 'churn_rate', threshold: 0.1, operator: 'gt', severity: 'high', message: '流失率超过10%' },
      { metric: 'gmv', threshold: -0.2, operator: 'lt', severity: 'medium', message: 'GMV环比下降20%' },
      { metric: 'active_users', threshold: -0.15, operator: 'lt', severity: 'medium', message: '活跃用户下降15%' }
    ];
  }

  async execute(input, context = {}) {
    const startTime = Date.now();
    
    const { 
      data, 
      rules = this.defaultRules,
      checkInterval = 'daily'
    } = input;

    const alerts = [];

    // 检查每个规则
    for (const rule of rules) {
      const value = this.getMetricValue(data, rule.metric);
      
      if (value !== undefined && this.checkThreshold(value, rule.threshold, rule.operator)) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          metric: rule.metric,
          value,
          threshold: rule.threshold,
          operator: rule.operator,
          severity: rule.severity,
          message: rule.message,
          timestamp: new Date().toISOString(),
          status: 'active',
          acknowledged: false
        });
      }
    }

    // 检查复合规则
    const compositeAlerts = this.checkCompositeRules(data);
    alerts.push(...compositeAlerts);

    // 排序和去重
    const uniqueAlerts = this.deduplicateAlerts(alerts);
    const sortedAlerts = uniqueAlerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    this.recordExecution(Date.now() - startTime);

    return {
      alerts: sortedAlerts,
      summary: {
        total: sortedAlerts.length,
        critical: sortedAlerts.filter(a => a.severity === 'critical').length,
        high: sortedAlerts.filter(a => a.severity === 'high').length,
        medium: sortedAlerts.filter(a => a.severity === 'medium').length,
        low: sortedAlerts.filter(a => a.severity === 'low').length,
        checkTime: new Date().toISOString()
      }
    };
  }

  getMetricValue(data, metric) {
    // 支持嵌套路径如 'conversion.daily.rate'
    const parts = metric.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    
    return Number(value);
  }

  checkThreshold(value, threshold, operator) {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      case 'between': return Array.isArray(threshold) && value >= threshold[0] && value <= threshold[1];
      default: return false;
    }
  }

  checkCompositeRules(data) {
    const alerts = [];

    // 检查多个指标同时异常的情况
    const metrics = {
      conversion: this.getMetricValue(data, 'conversion_rate'),
      gmv: this.getMetricValue(data, 'gmv_change'),
      active: this.getMetricValue(data, 'active_users_change')
    };

    // 转化率下降且GMV下降
    if (metrics.conversion < 0.02 && metrics.gmv < -0.1) {
      alerts.push({
        id: `alert_${Date.now()}_composite_1`,
        type: 'composite',
        severity: 'critical',
        message: '转化率与GMV同时下降，需紧急关注',
        metrics: ['conversion_rate', 'gmv'],
        timestamp: new Date().toISOString(),
        status: 'active'
      });
    }

    // 活跃用户和留存同时下降
    const retention = this.getMetricValue(data, 'retention_rate');
    if (metrics.active < -0.1 && retention < 0.3) {
      alerts.push({
        id: `alert_${Date.now()}_composite_2`,
        type: 'composite',
        severity: 'high',
        message: '活跃用户与留存率双降，可能存在产品问题',
        metrics: ['active_users', 'retention_rate'],
        timestamp: new Date().toISOString(),
        status: 'active'
      });
    }

    return alerts;
  }

  deduplicateAlerts(alerts) {
    const seen = new Map();
    
    return alerts.filter(alert => {
      const key = `${alert.metric}_${alert.message}`;
      if (seen.has(key)) {
        // 保留更严重的
        const existing = seen.get(key);
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (severityOrder[alert.severity] < severityOrder[existing.severity]) {
          seen.set(key, alert);
          return true;
        }
        return false;
      }
      seen.set(key, alert);
      return true;
    });
  }
}

module.exports = AlertGenerationSkill;
