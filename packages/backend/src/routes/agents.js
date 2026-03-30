/**
 * Agent 路由
 * 统一的 Agent 调用入口
 */

const express = require('express');
const { AgentRegistry } = require('../agents');

const router = express.Router();

/**
 * GET /api/agents
 * 获取所有 Agent 列表
 */
router.get('/', (req, res) => {
  const agents = AgentRegistry.getAllInfo();
  res.json({ code: 0, data: agents });
});

/**
 * GET /api/agents/:agentId
 * 获取单个 Agent 信息
 */
router.get('/:agentId', (req, res) => {
  const { agentId } = req.params;
  const agent = AgentRegistry.get(agentId);
  
  if (!agent) {
    return res.status(404).json({ code: -1, message: 'Agent 不存在' });
  }

  res.json({ code: 0, data: agent.getInfo() });
});

/**
 * GET /api/agents/:agentId/knowledge
 * 获取 Agent 知识库
 */
router.get('/:agentId/knowledge', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = AgentRegistry.get(agentId);
    
    if (!agent) {
      return res.status(404).json({ code: -1, message: 'Agent 不存在' });
    }

    const docs = await agent.knowledge.listDocuments();
    
    res.json({
      code: 0,
      data: {
        documents: docs,
        stats: agent.knowledge.getStats()
      }
    });
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * POST /api/agents/:agentId/knowledge
 * 添加文档到 Agent 知识库
 */
router.post('/:agentId/knowledge', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { filename, content } = req.body;
    const agent = AgentRegistry.get(agentId);
    
    if (!agent) {
      return res.status(404).json({ code: -1, message: 'Agent 不存在' });
    }

    const docId = await agent.knowledge.addDocument(filename, content);
    
    res.json({
      code: 0,
      data: { docId }
    });
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * POST /api/agents/:agentId/execute
 * 执行 Agent（非流式）
 */
router.post('/:agentId/execute', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = AgentRegistry.get(agentId);
    
    if (!agent) {
      return res.status(404).json({ code: -1, message: 'Agent 不存在' });
    }

    const results = [];
    for await (const chunk of agent.execute(req.body, req.context)) {
      results.push(chunk);
    }

    const content = results
      .filter(r => r.type === 'content')
      .map(r => r.data)
      .join('');

    const completeData = results.find(r => r.type === 'complete')?.data;

    res.json({
      code: 0,
      data: {
        content,
        completeData,
        agent: {
          id: agent.id,
          name: agent.name,
          icon: agent.icon
        }
      }
    });

  } catch (error) {
    console.error('[Agents] 执行错误:', error);
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * POST /api/agents/:agentId/execute-stream
 * 流式执行 Agent（SSE）
 */
router.post('/:agentId/execute-stream', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = AgentRegistry.get(agentId);
    
    if (!agent) {
      return res.status(404).json({ code: -1, message: 'Agent 不存在' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 发送开始事件
    res.write(`data: ${JSON.stringify({
      type: 'start',
      agent: { id: agent.id, name: agent.name, icon: agent.icon }
    })}\n\n`);

    for await (const chunk of agent.execute(req.body, req.context)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();

  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/agents/:agentId/stream
 * 流式执行 Agent（GET 版本）
 */
router.get('/:agentId/stream', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = AgentRegistry.get(agentId);
    
    if (!agent) {
      return res.status(404).json({ code: -1, message: 'Agent 不存在' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 发送开始事件
    res.write(`data: ${JSON.stringify({
      type: 'start',
      agent: { id: agent.id, name: agent.name, icon: agent.icon }
    })}\n\n`);

    for await (const chunk of agent.execute(req.query, req.context)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/agents/:agentId/skills
 * 获取 Agent 的技能列表
 */
router.get('/:agentId/skills', (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = AgentRegistry.get(agentId);
    
    if (!agent) {
      return res.status(404).json({ code: -1, message: 'Agent 不存在' });
    }

    // 获取 Agent 的 skills
    const skills = agent.skills ? agent.skills.map(s => s.getInfo()) : [];

    res.json({
      code: 0,
      data: skills
    });
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * POST /api/agents/route
 * 自动路由到最合适的 Agent
 */
router.post('/route', async (req, res) => {
  try {
    const { input } = req.body;
    const agent = await AgentRegistry.route(input);

    if (!agent) {
      return res.status(404).json({ code: -1, message: '没有找到合适的 Agent' });
    }

    res.json({
      code: 0,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          icon: agent.icon
        }
      }
    });

  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

module.exports = router;
