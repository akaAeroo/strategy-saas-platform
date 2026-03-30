/**
 * Automation Workflows 路由
 * 策略自动化执行管理
 */

const express = require('express');
const automationService = require('../services/automationService');

const router = express.Router();

/**
 * GET /api/automation/workflows
 * 获取所有工作流
 */
router.get('/workflows', (req, res) => {
  const workflows = automationService.getAllWorkflows();
  res.json({
    code: 0,
    data: workflows.map(wf => ({
      ...wf,
      roi: automationService.calculateROI(wf)
    }))
  });
});

/**
 * POST /api/automation/workflows
 * 创建工作流
 */
router.post('/workflows', (req, res) => {
  try {
    const workflow = automationService.createWorkflow(req.body);
    res.json({ code: 0, data: workflow });
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * GET /api/automation/workflows/:id
 * 获取单个工作流
 */
router.get('/workflows/:id', (req, res) => {
  const { id } = req.params;
  const workflow = automationService.getWorkflow(id);
  
  if (!workflow) {
    return res.status(404).json({ code: -1, message: '工作流不存在' });
  }

  res.json({
    code: 0,
    data: {
      ...workflow,
      roi: automationService.calculateROI(workflow)
    }
  });
});

/**
 * PUT /api/automation/workflows/:id
 * 更新工作流
 */
router.put('/workflows/:id', (req, res) => {
  const { id } = req.params;
  const workflow = automationService.updateWorkflow(id, req.body);
  
  if (!workflow) {
    return res.status(404).json({ code: -1, message: '工作流不存在' });
  }

  res.json({ code: 0, data: workflow });
});

/**
 * DELETE /api/automation/workflows/:id
 * 删除工作流
 */
router.delete('/workflows/:id', (req, res) => {
  const { id } = req.params;
  const deleted = automationService.deleteWorkflow(id);
  
  if (!deleted) {
    return res.status(404).json({ code: -1, message: '工作流不存在' });
  }

  res.json({ code: 0, message: '已删除' });
});

/**
 * POST /api/automation/workflows/:id/execute
 * 手动执行工作流
 */
router.post('/workflows/:id/execute', async (req, res) => {
  const { id } = req.params;
  const workflow = automationService.getWorkflow(id);
  
  if (!workflow) {
    return res.status(404).json({ code: -1, message: '工作流不存在' });
  }

  try {
    const result = await automationService._executeWorkflow(workflow, {
      ...req.body,
      trigger: 'manual',
      triggeredAt: new Date().toISOString()
    });

    res.json({ code: 0, data: result });
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * POST /api/automation/workflows/:id/toggle
 * 启用/禁用工作流
 */
router.post('/workflows/:id/toggle', (req, res) => {
  const { id } = req.params;
  const workflow = automationService.getWorkflow(id);
  
  if (!workflow) {
    return res.status(404).json({ code: -1, message: '工作流不存在' });
  }

  const updated = automationService.updateWorkflow(id, {
    enabled: !workflow.enabled
  });

  res.json({
    code: 0,
    data: updated,
    message: updated.enabled ? '已启用' : '已禁用'
  });
});

/**
 * GET /api/automation/executions
 * 获取执行历史
 */
router.get('/executions', (req, res) => {
  const { workflowId, limit = 50 } = req.query;
  const history = automationService.getExecutionHistory(
    workflowId,
    parseInt(limit)
  );
  
  res.json({ code: 0, data: history });
});

/**
 * GET /api/automation/triggers
 * 获取支持的触发器类型
 */
router.get('/triggers', (req, res) => {
  res.json({
    code: 0,
    data: [
      { type: 'strategy_created', label: '策略生成时', description: '当新的运营策略被创建时触发' },
      { type: 'segment_updated', label: '人群更新时', description: '当人群数据被更新时触发' },
      { type: 'diagnosis_completed', label: '诊断完成时', description: '当 AI 诊断完成时触发' },
      { type: 'scheduled', label: '定时触发', description: '按设定的时间间隔触发' },
      { type: 'manual', label: '手动触发', description: '需要手动点击执行' }
    ]
  });
});

/**
 * GET /api/automation/actions
 * 获取支持的动作类型
 */
router.get('/actions', (req, res) => {
  res.json({
    code: 0,
    data: [
      { type: 'webhook', label: 'Webhook', description: '调用外部 API', icon: '🔗' },
      { type: 'slack', label: 'Slack/消息', description: '发送消息到钉钉/飞书/企业微信', icon: '💬' },
      { type: 'email', label: '邮件', description: '发送邮件通知', icon: '📧' },
      { type: 'crm_sync', label: 'CRM 同步', description: '同步数据到 CRM 系统', icon: '📇' },
      { type: 'spreadsheet', label: '表格', description: '写入数据到表格', icon: '📊' },
      { type: 'notification', label: '系统通知', description: '发送系统内通知', icon: '🔔' },
      { type: 'ai_task', label: 'AI 任务', description: '使用 AI 生成后续任务', icon: '🤖' }
    ]
  });
});

/**
 * POST /api/automation/generate-plan
 * 为策略生成自动化方案（流式）
 */
router.post('/generate-plan', async (req, res) => {
  const { strategy } = req.body;

  if (!strategy) {
    return res.status(400).json({ code: -1, message: '缺少策略数据' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = automationService.generateAutomationPlan(strategy);

  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.end();
});

/**
 * GET /api/automation/stats
 * 获取自动化统计
 */
router.get('/stats', (req, res) => {
  const workflows = automationService.getAllWorkflows();
  const executions = automationService.getExecutionHistory(null, 1000);

  const stats = {
    totalWorkflows: workflows.length,
    enabledWorkflows: workflows.filter(w => w.enabled).length,
    totalExecutions: executions.length,
    successRate: executions.length > 0 
      ? (executions.filter(e => e.status === 'completed').length / executions.length * 100).toFixed(1)
      : 0,
    avgExecutionTime: executions.length > 0
      ? (executions.reduce((sum, e) => sum + (e.results?.reduce((s, r) => s + (r.duration || 0), 0) || 0), 0) / executions.length).toFixed(0)
      : 0
  };

  res.json({ code: 0, data: stats });
});

module.exports = router;
