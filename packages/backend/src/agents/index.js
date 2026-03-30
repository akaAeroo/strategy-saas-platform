/**
 * Agents 模块入口
 * 导出所有 Agent 类和注册中心
 */

const AgentRegistry = require('./AgentRegistry');
const BaseAgent = require('./BaseAgent');
const MemoryManager = require('./memory/MemoryManager');
const KnowledgeBase = require('./knowledge/KnowledgeBase');

// 导入所有 Agent 实现
const DataAnalysisAgent = require('./implementations/DataAnalysisAgent');
const AudienceDashboardAgent = require('./implementations/AudienceDashboardAgent');
const ContentTemplateAgent = require('./implementations/ContentTemplateAgent');
const PriceMonitoringAgent = require('./implementations/PriceMonitoringAgent');
const TitleGenerationAgent = require('./implementations/TitleGenerationAgent');

// Agent 类映射
const AGENT_CLASSES = {
  data_analysis: DataAnalysisAgent,
  audience_dashboard: AudienceDashboardAgent,
  content_template: ContentTemplateAgent,
  price_monitoring: PriceMonitoringAgent,
  title_generation: TitleGenerationAgent
};

/**
 * 初始化所有 Agents
 */
async function initializeAgents() {
  console.log('[Agents] 初始化 Agents...');
  
  for (const [id, AgentClass] of Object.entries(AGENT_CLASSES)) {
    try {
      const agent = new AgentClass();
      await AgentRegistry.register(agent);
    } catch (error) {
      console.error(`[Agents] 初始化 ${id} 失败:`, error);
    }
  }
  
  console.log(`[Agents] 已注册 ${AgentRegistry.getAll().length} 个 Agents`);
}

/**
 * 获取 Agent 信息（用于前端展示）
 */
function getAgentsInfo() {
  return AgentRegistry.getAll().map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    icon: agent.icon,
    color: agent.color,
    category: agent.category,
    isReady: agent.isReady,
    capabilities: agent.getCapabilitiesDescription ? agent.getCapabilitiesDescription() : '',
    quickActions: agent.getQuickActions ? agent.getQuickActions() : []
  }));
}

/**
 * 获取特定 Agent 的信息
 */
function getAgentInfo(agentId) {
  const agent = AgentRegistry.get(agentId);
  if (!agent) return null;
  
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    icon: agent.icon,
    color: agent.color,
    category: agent.category,
    isReady: agent.isReady,
    memory: agent.memory?.getStats(),
    knowledge: agent.knowledge?.getStats()
  };
}

/**
 * 执行 Agent（流式输出）
 */
async function* executeAgent(agentId, input, context = {}) {
  const agent = AgentRegistry.get(agentId);
  
  if (!agent) {
    yield { type: 'error', data: `Agent ${agentId} 不存在` };
    return;
  }

  if (!agent.isReady) {
    yield { type: 'error', data: `Agent ${agentId} 未就绪` };
    return;
  }

  try {
    const generator = agent.execute(input, context);
    
    for await (const output of generator) {
      yield output;
    }
  } catch (error) {
    console.error(`[Agent:${agentId}] 执行错误:`, error);
    yield { type: 'error', data: error.message };
  }
}

/**
 * 路由到最适合的 Agent
 */
async function routeAndExecute(input, preferredAgent = null) {
  const agent = await AgentRegistry.route(input, preferredAgent);
  
  if (!agent) {
    return {
      success: false,
      error: '没有找到合适的 Agent 处理此请求'
    };
  }

  const outputs = [];
  const generator = executeAgent(agent.id, input);
  
  for await (const output of generator) {
    outputs.push(output);
  }

  return {
    success: true,
    agent: agent.id,
    outputs
  };
}

module.exports = {
  // 核心类
  AgentRegistry,
  BaseAgent,
  MemoryManager,
  KnowledgeBase,
  
  // Agent 实现
  DataAnalysisAgent,
  AudienceDashboardAgent,
  ContentTemplateAgent,
  PriceMonitoringAgent,
  TitleGenerationAgent,
  
  // 函数
  initializeAgents,
  getAgentsInfo,
  getAgentInfo,
  executeAgent,
  routeAndExecute,
  AGENT_CLASSES
};
