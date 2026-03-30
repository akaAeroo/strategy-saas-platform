/**
 * 人群看板 Agent
 * 每日同步关键人群数据，生成监控报告
 */

const BaseAgent = require('../BaseAgent');
const { getAgentSkills } = require('../skills');

class AudienceDashboardAgent extends BaseAgent {
  constructor() {
    super({
      id: 'audience_dashboard',
      name: '人群看板',
      description: '每日同步关键人群数据，生成监控报告和预警',
      icon: '👥',
      color: '#3b82f6',
      category: 'dashboard'
    });

    this.skills = getAgentSkills(this.id);
    this.skillMap = {};
    for (const skill of this.skills) {
      this.skillMap[skill.id] = skill;
    }
  }

  canHandle(input) {
    const keywords = ['人群', '用户', '看板', '监控', '趋势', '预警', '留存', '转化'];
    return keywords.some(kw => (input.question || '').includes(kw)) ? 0.9 : 0.3;
  }

  getCapabilitiesDescription() {
    return `- 监控人群数据趋势
- 检测异常和预警
- 分析用户留存和转化
- 生成日报/周报
- 智能预警提醒`;
  }

  async *execute(input, context = {}) {
    const { question, segmentId, dateRange } = input;
    let hasSentContent = false;

    // 趋势分析
    if (question?.includes('趋势') || question?.includes('分析')) {
      hasSentContent = true; yield { type: 'content', data: '📊 正在分析人群趋势...\n\n' };
      
      try {
        const trendSkill = this.skillMap['trend_analysis'];
        
        if (trendSkill) {
          // 模拟时间序列数据
          const timeSeries = this.generateMockTimeSeries(30);
          
          const result = await trendSkill.execute({
            timeSeries,
            metrics: ['active_users', 'conversion_rate', 'retention_rate'],
            windowSize: 7
          });

          // 输出趋势概览
          hasSentContent = true; yield { type: 'content', data: '**📈 趋势概览**\n\n' };
          
          for (const trend of result.trends) {
            const directionEmoji = {
              'increasing_strongly': '🚀',
              'increasing': '📈',
              'decreasing_strongly': '🔻',
              'decreasing': '📉',
              'stable': '➡️'
            }[trend.direction] || '➡️';
            
            yield {
              type: 'content',
              data: `${directionEmoji} **${this.translateMetric(trend.metric)}**\n` +
                    `   变化：${trend.change > 0 ? '+' : ''}${trend.change}%\n` +
                    `   波动率：${trend.volatility}%\n\n`
            };
          }

          // 输出异常
          if (result.anomalies.length > 0) {
            hasSentContent = true; yield { type: 'content', data: '**⚠️ 异常检测**\n\n' };
            
            for (const anomaly of result.anomalies.slice(0, 5)) {
              yield {
                type: 'content',
                data: `• ${anomaly.date}：${this.translateMetric(anomaly.metric)} 异常值 ${anomaly.value}（预期 ${anomaly.expected}）\n`
              };
            }
            hasSentContent = true; yield { type: 'content', data: '\n' };
          }

          // 输出预测
          hasSentContent = true; yield { type: 'content', data: '**🔮 未来7天预测**\n\n' };
          
          for (const [metric, forecast] of Object.entries(result.forecast)) {
            if (forecast.values) {
              const lastValue = forecast.values[forecast.values.length - 1].value;
              yield {
                type: 'content',
                data: `• ${this.translateMetric(metric)}: 预计 ${lastValue}\n`
              };
            }
          }
          hasSentContent = true; yield { type: 'content', data: '\n' };

          // 健康度评分
          yield {
            type: 'content',
            data: `**健康度评分：${result.summary.healthScore}/100**\n` +
                  `${this.getHealthEmoji(result.summary.healthScore)} ${this.getHealthDescription(result.summary.healthScore)}\n\n`
          };
        }
      } catch (error) {
        yield { type: 'error', data: `趋势分析失败：${error.message}` };
      }
    }

    // 生成预警
    if (question?.includes('预警') || question?.includes('监控')) {
      hasSentContent = true; yield { type: 'content', data: '⚠️ 正在检查预警规则...\n\n' };
      
      try {
        const alertSkill = this.skillMap['alert_generation'];
        
        if (alertSkill) {
          // 模拟监控数据
          const monitorData = {
            conversion_rate: 0.015,
            churn_rate: 0.12,
            gmv: -0.25,
            active_users: -0.2
          };
          
          const result = await alertSkill.execute({
            data: monitorData,
            checkInterval: 'daily'
          });

          if (result.alerts.length === 0) {
            hasSentContent = true; yield { type: 'content', data: '✅ 当前无预警，所有指标正常\n\n' };
          } else {
            yield { 
              type: 'content', 
              data: `**发现 ${result.summary.total} 个预警**\n\n` 
            };
            
            for (const alert of result.alerts) {
              const severityEmoji = {
                'critical': '🔴',
                'high': '🟠',
                'medium': '🟡',
                'low': '🔵'
              }[alert.severity] || '⚪';
              
              yield {
                type: 'content',
                data: `${severityEmoji} **${alert.message}**\n` +
                      `   当前值：${alert.value}，阈值：${alert.threshold}\n\n`
              };
            }
          }
        }
      } catch (error) {
        yield { type: 'error', data: `预警检查失败：${error.message}` };
      }
    }

    // 生成日报
    if (question?.includes('日报') || question?.includes('报告')) {
      hasSentContent = true; 
      yield { type: 'content', data: '📋 正在使用AI生成人群日报...\n\n' };
      
      try {
        const systemPrompt = `你是一位资深数据分析师，专注于用户增长和人群运营分析。
要求：
1. 分析要客观、深入、有业务洞察
2. 提供可执行的运营建议
3. 使用中文回复
4. 格式清晰，使用Markdown表格和列表
5. 关注关键指标的变化趋势和异常`;

        // 生成模拟数据
        const mockData = this.generateMockTimeSeries(7);
        
        const prompt = `请根据以下人群数据生成日报：

日期：${new Date().toLocaleDateString('zh-CN')}

近7天数据：
${JSON.stringify(mockData, null, 2)}

请生成包含以下内容的人群日报：
1. 日报标题和日期
2. 核心指标表格（今日数值、环比变化、状态标识）
3. 人群分布分析
4. 关键洞察（至少3点）
5. 明日运营建议（至少3条）
6. 需要关注的风险点`;

        for await (const chunk of this.callLLM(systemPrompt, [{ role: 'user', content: prompt }])) {
          yield { type: 'content', data: chunk };
        }
        
        yield { type: 'content', data: '\n\n' };
        
      } catch (error) {
        yield { type: 'error', data: `日报生成失败：${error.message}` };
      }
    }

    // 默认回复
    if (!hasSentContent) {
      yield {
        type: 'content',
        data: `你好！我是人群看板助手，可以帮助你：

📊 **数据监控**
• 分析人群数据趋势
• 检测异常和预警
• 查看留存率、转化率等指标

📈 **分析报告**
• 生成日报/周报
• 人群分布分析
• 健康度评分

💡 **使用方法**
1. 输入"查看趋势"分析数据变化
2. 输入"检查预警"查看异常情况
3. 输入"生成日报"获取今日报告

有什么可以帮你的吗？`
      };
    }

    await this.recordConversation(question || '人群分析', '分析完成', { important: true });
    yield { type: 'complete', data: { success: true } };
  }

  generateMockTimeSeries(days) {
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        active_users: Math.floor(100000 + Math.random() * 20000),
        conversion_rate: 0.02 + Math.random() * 0.02,
        retention_rate: 0.4 + Math.random() * 0.1
      });
    }
    
    return data;
  }

  translateMetric(metric) {
    const map = {
      'active_users': '活跃用户',
      'conversion_rate': '转化率',
      'retention_rate': '留存率',
      'gmv': 'GMV',
      'churn_rate': '流失率'
    };
    return map[metric] || metric;
  }

  getHealthEmoji(score) {
    if (score >= 90) return '💚';
    if (score >= 70) return '💛';
    if (score >= 50) return '🧡';
    return '❤️';
  }

  getHealthDescription(score) {
    if (score >= 90) return '健康状况优秀';
    if (score >= 70) return '健康状况良好';
    if (score >= 50) return '需要关注';
    return '健康状况堪忧，需立即处理';
  }

  getQuickActions() {
    return [
      { label: '📊 查看趋势', prompt: '分析人群数据趋势' },
      { label: '⚠️ 检查预警', prompt: '检查当前预警状态' },
      { label: '📋 生成日报', prompt: '生成今日人群日报' },
      { label: '🔍 深度分析', prompt: '深度分析用户行为' }
    ];
  }
}

module.exports = AudienceDashboardAgent;
