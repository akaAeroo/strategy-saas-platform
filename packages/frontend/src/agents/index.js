/**
 * 前端 Agent 模块
 * Agent 配置和 Skill 定义
 */

// Agent 配置
export const AGENTS_CONFIG = {
  audience_dashboard: {
    id: 'audience_dashboard',
    name: '人群看板',
    description: '每日同步关键人群数据，生成监控报告',
    icon: '📊',
    color: '#3b82f6',
    category: 'dashboard',
    skills: ['data_sync', 'trend_analysis', 'alert_generation', 'report_export']
  },
  data_analysis: {
    id: 'data_analysis',
    name: '数据分析',
    description: '分析数据文件，生成洞察和可视化',
    icon: '📈',
    color: '#10b981',
    category: 'analysis',
    skills: ['file_parse', 'statistical_analysis', 'visualization', 'insight_generation']
  },
  title_generation: {
    id: 'title_generation',
    name: '标题生成',
    description: '基于商品信息生成营销标题',
    icon: '✨',
    color: '#f59e0b',
    category: 'content',
    skills: ['keyword_extract', 'title_template', 'ab_test', 'platform_optimize']
  },
  price_monitoring: {
    id: 'price_monitoring',
    name: '价格监控',
    description: '抓取竞品价格，生成比价报告',
    icon: '💰',
    color: '#ef4444',
    category: 'research',
    skills: ['web_scrape', 'price_compare', 'alert_setup', 'trend_track']
  },
  content_template: {
    id: 'content_template',
    name: '触达内容',
    description: '生成短信/Push/站内信内容',
    icon: '💬',
    color: '#8b5cf6',
    category: 'content',
    skills: ['template_select', 'content_generate', 'personalize', 'compliance_check']
  }
};

// Skill 定义
export const SKILLS_CONFIG = {
  data_sync: {
    id: 'data_sync',
    name: '数据同步',
    icon: '🔄',
    description: '同步人群数据到本地'
  },
  file_parse: {
    id: 'file_parse',
    name: '文件解析',
    icon: '📄',
    description: '解析 Excel/CSV 文件'
  },
  statistical_analysis: {
    id: 'statistical_analysis',
    name: '统计分析',
    icon: '📊',
    description: '执行统计分析和计算'
  },
  title_template: {
    id: 'title_template',
    name: '标题模板',
    icon: '📝',
    description: '基于模板生成标题'
  },
  content_generate: {
    id: 'content_generate',
    name: '内容生成',
    icon: '✍️',
    description: '生成营销文案'
  },
  web_scrape: {
    id: 'web_scrape',
    name: '网页抓取',
    icon: '🕷️',
    description: '抓取网页内容'
  },
  price_compare: {
    id: 'price_compare',
    name: '比价分析',
    icon: '⚖️',
    description: '对比多个平台价格'
  },
  trend_analysis: {
    id: 'trend_analysis',
    name: '趋势分析',
    icon: '📉',
    description: '分析数据趋势和异常'
  },
  alert_generation: {
    id: 'alert_generation',
    name: '预警生成',
    icon: '⚠️',
    description: '生成数据预警'
  },
  insight_generation: {
    id: 'insight_generation',
    name: '洞察生成',
    icon: '💡',
    description: '基于数据生成洞察'
  },
  platform_optimize: {
    id: 'platform_optimize',
    name: '平台优化',
    icon: '🎯',
    description: '针对平台优化内容'
  },
  personalize: {
    id: 'personalize',
    name: '个性化',
    icon: '👤',
    description: '基于用户画像个性化内容'
  },
  compliance_check: {
    id: 'compliance_check',
    name: '合规检查',
    icon: '✅',
    description: '检查内容合规性'
  },
  report_export: {
    id: 'report_export',
    name: '报告导出',
    icon: '📤',
    description: '导出分析报告'
  },
  visualization: {
    id: 'visualization',
    name: '可视化',
    icon: '📊',
    description: '生成数据图表'
  },
  template_select: {
    id: 'template_select',
    name: '模板选择',
    icon: '🎨',
    description: '选择合适的文案模板'
  }
};

// 获取 Agent 的 Skills 详情
export function getAgentSkills(agentId) {
  if (!agentId) return [];
  const agent = AGENTS_CONFIG[agentId];
  if (!agent || !agent.skills) return [];
  
  return agent.skills.map(skillId => SKILLS_CONFIG[skillId]).filter(Boolean);
}

// 获取所有 Agents
export function getAllAgents() {
  return Object.values(AGENTS_CONFIG || {});
}

// 执行 Agent（流式）
export async function* executeAgent(agentId, params) {
  const response = await fetch(`/api/agents/${agentId}/execute-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error('Agent 执行失败');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield data;
        } catch (e) {
          console.warn('解析响应失败:', line);
        }
      }
    }
  }
}
