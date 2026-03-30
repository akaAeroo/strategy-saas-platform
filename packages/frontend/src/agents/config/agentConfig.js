/**
 * Agent 配置文件
 * 定义所有可用的 AI Agent
 */

export const agentCategories = {
  ANALYSIS: '数据分析',
  CONTENT: '内容创作',
  MONITORING: '监控预警'
}

export const agents = [
  {
    id: 'data_analysis',
    name: '数据分析助手',
    description: 'Excel/CSV 数据分析、统计洞察、可视化建议',
    category: agentCategories.ANALYSIS,
    icon: '📊',
    color: '#7ee787',
    skills: ['file_parse', 'statistical_analysis', 'chart_generate', 'insight_generation'],
    suggestedQueries: [
      '帮我分析这个销售数据',
      '计算一下平均值和增长率',
      '生成数据可视化建议',
      '发现数据中的异常值'
    ]
  },
  {
    id: 'audience_dashboard',
    name: '人群看板助手',
    description: '人群画像分析、洞察发现、报告生成',
    category: agentCategories.ANALYSIS,
    icon: '👥',
    color: '#60a5fa',
    skills: ['audience_analysis', 'persona_generation', 'report_generation'],
    suggestedQueries: [
      '分析目标用户画像',
      '生成人群洞察报告',
      '对比不同用户群体',
      '发现高价值用户特征'
    ]
  },
  {
    id: 'content_template',
    name: '内容模板助手',
    description: '营销文案、内容模板生成、风格适配',
    category: agentCategories.CONTENT,
    icon: '✍️',
    color: '#f472b6',
    skills: ['content_generate', 'template_manager', 'style_adapter'],
    suggestedQueries: [
      '生成产品推广文案',
      '帮我改写这段话',
      '创建一个邮件模板',
      '适配小红书风格'
    ]
  },
  {
    id: 'price_monitoring',
    name: '价格监控助手',
    description: '竞品价格追踪、异常预警、趋势分析',
    category: agentCategories.MONITORING,
    icon: '💰',
    color: '#fbbf24',
    skills: ['price_scrape', 'alert_manager', 'trend_analysis'],
    suggestedQueries: [
      '监控竞品价格变化',
      '设置价格预警规则',
      '分析价格趋势',
      '发现价格异常'
    ]
  },
  {
    id: 'title_generation',
    name: '标题生成助手',
    description: '高点击率标题生成、A/B 测试建议',
    category: agentCategories.CONTENT,
    icon: '📝',
    color: '#a78bfa',
    skills: ['title_generate', 'ab_test', 'ctr_prediction'],
    suggestedQueries: [
      '生成10个吸引人的标题',
      '优化这个标题的点击率',
      '给这个产品起个名字',
      '生成A/B测试方案'
    ]
  }
]

// 获取所有 Agent
export const getAllAgents = () => agents

// 根据 ID 获取 Agent
export const getAgentById = (id) => agents.find(a => a.id === id)

// 根据分类获取 Agent
export const getAgentsByCategory = (category) => agents.filter(a => a.category === category)

// 获取默认 Agent
export const getDefaultAgent = () => agents[0]

export default agents
