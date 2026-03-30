/**
 * 统一聊天路由
 * 统一的 AI 对话入口，支持多 Skill 路由
 */

const express = require('express');
const { SkillRegistry } = require('../skills');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 文件上传配置 - 支持中文文件名
const storage = multer.memoryStorage({
  filename: function (req, file, cb) {
    // 处理中文文件名编码
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, decodedName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // 解码文件名
    if (file.originalname) {
      try {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      } catch (e) {
        // 如果解码失败，保持原样
      }
    }
    cb(null, true);
  }
});

const TEMP_DIR = path.join(__dirname, '../../temp/uploads');
fs.ensureDirSync(TEMP_DIR);

// 会话存储（生产环境用 Redis）
const sessions = new Map();

/**
 * 获取或创建会话
 */
function getSession(sessionId) {
  if (!sessionId || !sessions.has(sessionId)) {
    const newSession = {
      id: sessionId || `session_${Date.now()}`,
      messages: [],
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    sessions.set(newSession.id, newSession);
    return newSession;
  }
  return sessions.get(sessionId);
}

/**
 * POST /api/chat/send
 * 统一消息发送（支持文件上传）
 * 如果只上传文件没有消息，返回文件信息
 */
router.post('/send', upload.single('file'), async (req, res) => {
  try {
    const { message, sessionId, skill: preferredSkill } = req.body;
    const session = getSession(sessionId);
    const file = req.file;

    // 处理文件上传
    let fileInfo = null;
    if (file) {
      const uploadId = uuidv4();
      const filePath = path.join(TEMP_DIR, `${uploadId}_${file.originalname}`);
      await fs.writeFile(filePath, file.buffer);

      fileInfo = {
        id: uploadId,
        filename: file.originalname,
        path: filePath,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };

      session.files.push(fileInfo);
    }

    // 如果只有文件没有消息，直接返回文件信息（用于后续流式对话）
    if (!message && fileInfo) {
      return res.json({
        code: 0,
        data: {
          file: fileInfo,
          sessionId: session.id
        }
      });
    }

    // 构建输入
    const input = {
      question: message,
      file: fileInfo?.path,
      fileId: fileInfo?.id,
      ...req.body
    };

    // 添加用户消息到会话
    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      file: fileInfo,
      timestamp: Date.now()
    };
    session.messages.push(userMessage);

    // Skill 路由
    let skill;
    if (preferredSkill && SkillRegistry.get(preferredSkill)) {
      skill = SkillRegistry.get(preferredSkill);
    } else {
      skill = await SkillRegistry.route(input);
    }

    // 如果没有合适的 Skill，使用通用对话
    if (!skill) {
      skill = SkillRegistry.get('chat');
    }

    // 构建上下文
    const context = {
      sessionId: session.id,
      recentMessages: session.messages.slice(-10),
      activeFiles: session.files,
      skill: skill.id
    };

    // 验证输入
    const validation = skill.validateInput(input);
    if (!validation.valid) {
      return res.status(400).json({
        code: -1,
        message: '输入验证失败',
        errors: validation.errors
      });
    }

    // 执行 Skill
    const results = [];
    for await (const chunk of skill.execute(input, context)) {
      results.push(chunk);
    }

    // 整理输出
    const content = results
      .filter(r => r.type === 'content')
      .map(r => r.data)
      .join('');

    const completeData = results.find(r => r.type === 'complete')?.data;
    const error = results.find(r => r.type === 'error');

    // 添加助手消息到会话
    const assistantMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content,
      skill: skill.id,
      skillName: skill.name,
      data: completeData,
      timestamp: Date.now()
    };
    session.messages.push(assistantMessage);
    session.updatedAt = Date.now();

    if (error) {
      return res.status(500).json({
        code: -1,
        message: error.data,
        skill: skill.id
      });
    }

    res.json({
      code: 0,
      data: {
        message: assistantMessage,
        sessionId: session.id,
        skill: {
          id: skill.id,
          name: skill.name,
          icon: skill.icon
        },
        completeData
      }
    });

  } catch (error) {
    console.error('[Chat] 发送消息错误:', error);
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * GET /api/chat/stream
 * 流式消息发送
 */
router.get('/stream', async (req, res) => {
  try {
    const { message, sessionId, skill: preferredSkill, fileId } = req.query;
    const session = getSession(sessionId);

    // 如果有 fileId，从 session 中获取文件信息
    let fileInfo = null;
    if (fileId) {
      fileInfo = session.files.find(f => f.id === fileId);
    }

    // 构建输入
    const input = { 
      question: message, 
      fileId,
      file: fileInfo?.path,
      ...req.query 
    };

    // 添加用户消息
    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      file: fileInfo,
      timestamp: Date.now()
    };
    session.messages.push(userMessage);

    // Skill 路由
    let skill;
    if (preferredSkill && SkillRegistry.get(preferredSkill)) {
      skill = SkillRegistry.get(preferredSkill);
    } else {
      skill = await SkillRegistry.route(input);
    }
    if (!skill) skill = SkillRegistry.get('chat');

    // 构建上下文
    const context = {
      sessionId: session.id,
      recentMessages: session.messages.slice(-10),
      activeFiles: session.files,
      skill: skill.id
    };

    // 设置 SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 发送开始事件
    res.write(`data: ${JSON.stringify({
      type: 'start',
      skill: { id: skill.id, name: skill.name, icon: skill.icon }
    })}\n\n`);

    // 执行 Skill 并流式输出
    let content = '';
    let completeData = null;

    for await (const chunk of skill.execute(input, context)) {
      if (chunk.type === 'content') {
        content += chunk.data;
        res.write(`data: ${JSON.stringify({
          type: 'content',
          data: chunk.data
        })}\n\n`);
      } else if (chunk.type === 'status') {
        res.write(`data: ${JSON.stringify({
          type: 'status',
          data: chunk.data
        })}\n\n`);
      } else if (chunk.type === 'complete') {
        completeData = chunk.data;
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          data: chunk.data
        })}\n\n`);
      }
    }

    // 添加助手消息到会话
    const assistantMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content,
      skill: skill.id,
      skillName: skill.name,
      data: completeData,
      timestamp: Date.now()
    };
    session.messages.push(assistantMessage);
    session.updatedAt = Date.now();

    // 发送完成事件
    res.write(`data: ${JSON.stringify({
      type: 'done',
      message: assistantMessage,
      sessionId: session.id,
      completeData
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('[Chat] 流式错误:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      data: error.message
    })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/chat/sessions
 * 获取会话列表
 */
router.get('/sessions', (req, res) => {
  const sessionList = Array.from(sessions.values())
    .map(s => ({
      id: s.id,
      messageCount: s.messages.length,
      fileCount: s.files.length,
      lastMessage: s.messages[s.messages.length - 1]?.content.slice(0, 100),
      updatedAt: s.updatedAt
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  res.json({ code: 0, data: sessionList });
});

/**
 * GET /api/chat/sessions/:sessionId
 * 获取会话详情
 */
router.get('/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ code: -1, message: '会话不存在' });
  }

  res.json({
    code: 0,
    data: session
  });
});

/**
 * DELETE /api/chat/sessions/:sessionId
 * 删除会话
 */
router.delete('/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (session) {
    // 清理文件
    for (const file of session.files) {
      try {
        await fs.remove(file.path);
      } catch (e) {}
    }
    sessions.delete(sessionId);
  }

  res.json({ code: 0, message: '已删除' });
});

/**
 * GET /api/chat/skills
 * 获取所有可用的 Skills
 */
router.get('/skills', (req, res) => {
  const skills = SkillRegistry.getAllInfo();
  res.json({ code: 0, data: skills });
});

module.exports = router;
