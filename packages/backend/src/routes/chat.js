/**
 * AI 对话路由
 */

const express = require('express');
const chatService = require('../services/chatService');

const router = express.Router();

/**
 * POST /api/chat/create
 * 创建对话会话
 */
router.post('/create', (req, res) => {
  try {
    const { uploadId, uploadData } = req.body;
    const session = chatService.createSession(uploadData);
    
    res.json({
      code: 0,
      data: {
        sessionId: session.id,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * GET /api/chat/stream
 * 流式对话（SSE）
 */
router.get('/stream', async (req, res) => {
  try {
    const { sessionId, message } = req.query;
    
    if (!sessionId || !message) {
      return res.status(400).json({ code: -1, message: '缺少参数' });
    }

    // 设置 SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = chatService.streamChat(sessionId, message);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('流式对话错误:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/chat/send
 * 非流式对话
 */
router.post('/send', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ code: -1, message: '缺少参数' });
    }

    const response = [];
    const stream = chatService.streamChat(sessionId, message);

    for await (const chunk of stream) {
      if (chunk.type === 'content') {
        response.push(chunk.data);
      }
    }

    res.json({
      code: 0,
      data: {
        content: response.join('')
      }
    });
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * POST /api/chat/strategy
 * 生成策略
 */
router.post('/strategy', async (req, res) => {
  try {
    const { sessionId, requirements } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ code: -1, message: '缺少 sessionId' });
    }

    const result = await chatService.generateStrategy(sessionId, requirements);

    res.json({
      code: 0,
      data: result
    });
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * GET /api/chat/history/:sessionId
 * 获取对话历史
 */
router.get('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = chatService.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({ code: -1, message: '会话不存在' });
  }

  res.json({
    code: 0,
    data: session.messages
  });
});

/**
 * DELETE /api/chat/:sessionId
 * 删除会话
 */
router.delete('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  // 这里可以实现删除逻辑
  res.json({ code: 0, message: '已删除' });
});

module.exports = router;
