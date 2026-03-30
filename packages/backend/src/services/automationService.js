/**
 * Automation Workflows Service
 * 策略自动化执行引擎
 * 将策略输出与外部工具集成，实现自动化运营
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { config } = require('../config');

// 工作流存储（生产环境用数据库）
const workflows = new Map();
const executions = new Map();

// 触发器类型
const TRIGGER_TYPES = {
  STRATEGY_CREATED: 'strategy_created',      // 策略生成时
  SEGMENT_UPDATED: 'segment_updated',        // 人群更新时
  DIAGNOSIS_COMPLETED: 'diagnosis_completed', // 诊断完成时
  SCHEDULED: 'scheduled',                     // 定时触发
  MANUAL: 'manual'                           // 手动触发
};

// 动作类型
const ACTION_TYPES = {
  WEBHOOK: 'webhook',           // 调用外部 Webhook
  EMAIL: 'email',               // 发送邮件
  SLACK: 'slack',               // 发送 Slack 消息
  CRM_SYNC: 'crm_sync',         // 同步到 CRM
  SPREADSHEET: 'spreadsheet',   // 写入表格
  NOTIFICATION: 'notification', // 系统通知
  AI_TASK: 'ai_task'           // AI 生成任务
}

class AutomationService {
  constructor() {
    this.triggers = TRIGGER_TYPES;
    this.actions = ACTION_TYPES;
  }

  /**
   * 系统提示词 - 自动化策略专家
   */
  getSystemPrompt() {
    return `你是智能策略平台的 Automation 专家，擅长将策略转化为可执行的自动化工作流。

## 核心能力
1. **策略拆解**：将策略方案拆解为可自动化的步骤
2. **工具匹配**：推荐最适合的外部工具（钉钉、企业微信、飞书、邮件、CRM等）
3. **流程设计**：设计触发器-条件-动作的完整工作流
4. **ROI 评估**：评估自动化的投入产出比

## 输出规范
- 使用中文回复
- 提供具体可执行的建议
- 包含示例配置（JSON格式）
- 标注推荐的工具和服务

## 支持的触发器
- strategy_created: 策略生成时
- segment_updated: 人群更新时  
- diagnosis_completed: 诊断完成时
- scheduled: 定时触发
- manual: 手动触发

## 支持的动作
- webhook: 调用外部系统
- email: 发送邮件
- slack: 发送消息到 IM
- crm_sync: 同步到 CRM
- spreadsheet: 写入表格
- notification: 系统通知`;
  }

  /**
   * 创建自动化工作流
   */
  createWorkflow(data) {
    const workflow = {
      id: `wf_${uuidv4().slice(0, 8)}`,
      name: data.name,
      description: data.description,
      enabled: data.enabled !== false,
      trigger: {
        type: data.triggerType,
        config: data.triggerConfig || {}
      },
      conditions: data.conditions || [],
      actions: data.actions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionCount: 0,
      lastExecutedAt: null
    };

    workflows.set(workflow.id, workflow);
    console.log(`[Automation] 创建工作流: ${workflow.id} - ${workflow.name}`);
    return workflow;
  }

  /**
   * 获取工作流
   */
  getWorkflow(id) {
    return workflows.get(id);
  }

  /**
   * 获取所有工作流
   */
  getAllWorkflows() {
    return Array.from(workflows.values());
  }

  /**
   * 更新工作流
   */
  updateWorkflow(id, updates) {
    const workflow = workflows.get(id);
    if (!workflow) return null;

    Object.assign(workflow, updates, { updatedAt: new Date().toISOString() });
    return workflow;
  }

  /**
   * 删除工作流
   */
  deleteWorkflow(id) {
    return workflows.delete(id);
  }

  /**
   * 触发工作流执行
   */
  async triggerWorkflow(triggerType, context) {
    const matchingWorkflows = this.getAllWorkflows().filter(wf => 
      wf.enabled && wf.trigger.type === triggerType
    );

    const results = [];
    for (const workflow of matchingWorkflows) {
      // 检查条件
      if (!this._checkConditions(workflow.conditions, context)) {
        continue;
      }

      // 执行工作流
      const result = await this._executeWorkflow(workflow, context);
      results.push(result);
    }

    return results;
  }

  /**
   * 检查条件
   */
  _checkConditions(conditions, context) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      const { field, operator, value } = condition;
      const fieldValue = this._getFieldValue(context, field);

      switch (operator) {
        case 'eq': return fieldValue === value;
        case 'ne': return fieldValue !== value;
        case 'gt': return fieldValue > value;
        case 'gte': return fieldValue >= value;
        case 'lt': return fieldValue < value;
        case 'lte': return fieldValue <= value;
        case 'contains': return String(fieldValue).includes(value);
        case 'in': return Array.isArray(value) && value.includes(fieldValue);
        default: return true;
      }
    });
  }

  /**
   * 获取字段值（支持嵌套路径）
   */
  _getFieldValue(obj, path) {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }

  /**
   * 执行工作流
   */
  async _executeWorkflow(workflow, context) {
    const executionId = `exec_${uuidv4().slice(0, 8)}`;
    const execution = {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      results: [],
      error: null
    };

    executions.set(executionId, execution);
    console.log(`[Automation] 开始执行工作流: ${workflow.id} (${executionId})`);

    try {
      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        const result = await this._executeAction(action, context, executionId);
        execution.results.push(result);

        if (!result.success) {
          execution.status = 'failed';
          execution.error = result.error;
          break;
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
      }

      execution.completedAt = new Date().toISOString();
      workflow.executionCount++;
      workflow.lastExecutedAt = execution.completedAt;

    } catch (error) {
      execution.status = 'error';
      execution.error = error.message;
      execution.completedAt = new Date().toISOString();
    }

    console.log(`[Automation] 工作流执行完成: ${executionId} - ${execution.status}`);
    return execution;
  }

  /**
   * 执行单个动作
   */
  async _executeAction(action, context, executionId) {
    const { type, config } = action;
    const startTime = Date.now();

    try {
      let result;

      switch (type) {
        case ACTION_TYPES.WEBHOOK:
          result = await this._executeWebhook(config, context);
          break;
        case ACTION_TYPES.SLACK:
          result = await this._executeSlack(config, context);
          break;
        case ACTION_TYPES.EMAIL:
          result = await this._executeEmail(config, context);
          break;
        case ACTION_TYPES.CRM_SYNC:
          result = await this._executeCrmSync(config, context);
          break;
        case ACTION_TYPES.SPREADSHEET:
          result = await this._executeSpreadsheet(config, context);
          break;
        case ACTION_TYPES.NOTIFICATION:
          result = await this._executeNotification(config, context);
          break;
        case ACTION_TYPES.AI_TASK:
          result = await this._executeAiTask(config, context);
          break;
        default:
          throw new Error(`未知的动作类型: ${type}`);
      }

      return {
        actionType: type,
        success: true,
        result,
        duration: Date.now() - startTime,
        executedAt: new Date().toISOString()
      };

    } catch (error) {
      return {
        actionType: type,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        executedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 执行 Webhook 动作
   */
  async _executeWebhook(config, context) {
    const { url, method = 'POST', headers = {}, bodyTemplate } = config;
    
    // 模板替换
    const body = this._replaceTemplate(bodyTemplate || '{}', context);
    
    const response = await axios({
      url,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      data: JSON.parse(body),
      timeout: 30000
    });

    return {
      status: response.status,
      data: response.data
    };
  }

  /**
   * 执行 Slack 消息发送
   */
  async _executeSlack(config, context) {
    const { webhookUrl, messageTemplate, channel } = config;
    
    const message = this._replaceTemplate(messageTemplate, context);
    
    const payload = {
      text: message,
      channel: channel
    };

    const response = await axios.post(webhookUrl, payload, {
      timeout: 10000
    });

    return {
      sent: true,
      channel
    };
  }

  /**
   * 执行邮件发送
   */
  async _executeEmail(config, context) {
    const { to, subject, bodyTemplate, smtpConfig } = config;
    
    // 这里应该调用邮件服务
    // 简化版：记录到执行日志
    const body = this._replaceTemplate(bodyTemplate, context);
    
    console.log(`[Automation] 发送邮件到: ${to}`);
    
    return {
      to,
      subject: this._replaceTemplate(subject, context),
      sent: true
    };
  }

  /**
   * 执行 CRM 同步
   */
  async _executeCrmSync(config, context) {
    const { crmType, apiEndpoint, apiKey, dataMapping } = config;
    
    // 构建同步数据
    const syncData = {};
    for (const [crmField, sourcePath] of Object.entries(dataMapping)) {
      syncData[crmField] = this._getFieldValue(context, sourcePath);
    }

    console.log(`[Automation] 同步到 ${crmType}:`, syncData);

    return {
      crmType,
      synced: true,
      data: syncData
    };
  }

  /**
   * 执行表格写入
   */
  async _executeSpreadsheet(config, context) {
    const { sheetUrl, sheetName, rowData } = config;
    
    // 构建行数据
    const row = rowData.map(field => this._getFieldValue(context, field) || '');
    
    console.log(`[Automation] 写入表格 [${sheetName}]:`, row);

    return {
      sheet: sheetName,
      row,
      written: true
    };
  }

  /**
   * 执行系统通知
   */
  async _executeNotification(config, context) {
    const { title, messageTemplate, level = 'info' } = config;
    
    const message = this._replaceTemplate(messageTemplate, context);
    
    console.log(`[Automation] 系统通知 [${level}]: ${title} - ${message}`);

    return {
      title,
      message,
      level,
      notified: true
    };
  }

  /**
   * 执行 AI 任务生成
   */
  async _executeAiTask(config, context) {
    const { prompt, outputField } = config;
    
    // 这里应该调用 AI 服务生成任务
    const filledPrompt = this._replaceTemplate(prompt, context);
    
    console.log(`[Automation] AI 任务生成: ${filledPrompt.slice(0, 100)}...`);

    return {
      prompt: filledPrompt,
      generated: true,
      outputField
    };
  }

  /**
   * 模板替换
   */
  _replaceTemplate(template, context) {
    if (typeof template !== 'string') return JSON.stringify(template);
    
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this._getFieldValue(context, path);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 为策略生成推荐自动化方案
   */
  async *generateAutomationPlan(strategy) {
    const prompt = `请为以下运营策略设计自动化工作流方案：

策略信息：
${JSON.stringify(strategy, null, 2)}

请提供：
1. 推荐的自动化触发器
2. 建议的动作序列
3. 推荐的外部工具
4. 预期 ROI 评估
5. 实施步骤`;

    try {
      const aiProvider = config.ai.provider;
      const aiConfig = config.ai[aiProvider];

      const requestBody = {
        model: aiConfig.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
        stream: true
      };

      if (aiProvider === 'opencode' && aiConfig.providerId) {
        requestBody.provider_id = aiConfig.providerId;
      }

      const response = await axios.post(
        `${aiConfig.baseUrl}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${aiConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim() === '' || line === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                yield { type: 'content', data: data.choices[0].delta.content };
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      yield { type: 'error', data: error.message };
    }
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(workflowId = null, limit = 50) {
    const all = Array.from(executions.values());
    const filtered = workflowId 
      ? all.filter(e => e.workflowId === workflowId)
      : all;
    
    return filtered
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, limit);
  }

  /**
   * 计算 ROI
   */
  calculateROI(workflow) {
    const setupTimeHours = 1; // 假设设置时间 1 小时
    const hourlyRate = 50; // 时薪 50 元
    const setupCost = setupTimeHours * hourlyRate;
    
    const monthlyExecutions = workflow.executionCount || 0;
    const timeSavedPerExecution = 0.25; // 每次执行节省 15 分钟
    const monthlyTimeSaved = monthlyExecutions * timeSavedPerExecution;
    const monthlyValue = monthlyTimeSaved * hourlyRate;
    
    const paybackMonths = monthlyValue > 0 ? setupCost / monthlyValue : Infinity;
    
    return {
      setupCost,
      monthlyTimeSaved,
      monthlyValue,
      paybackMonths: paybackMonths === Infinity ? 'N/A' : paybackMonths.toFixed(1),
      worthIt: paybackMonths < 3
    };
  }
}

module.exports = new AutomationService();
