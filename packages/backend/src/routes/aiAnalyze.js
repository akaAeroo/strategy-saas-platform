/**
 * AI 直接分析路由
 * 上传文件后，AI 直接解析并分析数据
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const aiDataAnalyst = require('../services/aiDataAnalyst');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 内存存储
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('只支持 .xlsx, .xls, .csv 文件'));
    }
  }
});

// 临时目录
const TEMP_DIR = path.join(__dirname, '../../temp');
fs.ensureDirSync(TEMP_DIR);

// 会话存储（生产环境用 Redis）
const analysisSessions = new Map();

/**
 * POST /api/ai-analyze/upload
 * 上传文件并立即让 AI 分析
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: -1, message: '请选择文件' });
    }

    console.log('AI 分析 - 收到文件:', req.file.originalname);

    // 保存文件
    const uploadId = uuidv4();
    const filePath = path.join(TEMP_DIR, `${uploadId}_${req.file.originalname}`);
    await fs.writeFile(filePath, req.file.buffer);

    // 解析为 CSV（供 AI 分析）
    const csvData = await aiDataAnalyst.parseFileToCSV(filePath, 500); // 采样前 500 行

    // 创建分析会话
    const sessionId = `analysis_${Date.now()}`;
    analysisSessions.set(sessionId, {
      id: sessionId,
      uploadId,
      filePath,
      csvData,
      filename: req.file.originalname,
      createdAt: Date.now()
    });

    res.json({
      code: 0,
      data: {
        sessionId,
        filename: req.file.originalname,
        totalRows: csvData.totalRows,
        sampledRows: csvData.sampledRows,
        headers: csvData.headers,
        message: '文件上传成功，可开始进行 AI 分析'
      }
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * GET /api/ai-analyze/stream
 * 流式 AI 分析（SSE）
 */
router.get('/stream', async (req, res) => {
  try {
    const { sessionId, question } = req.query;

    if (!sessionId) {
      return res.status(400).json({ code: -1, message: '缺少 sessionId' });
    }

    const session = analysisSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ code: -1, message: '会话不存在或已过期' });
    }

    // 设置 SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 流式分析
    const stream = aiDataAnalyst.analyzeStream(session.csvData, question);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('流式分析错误:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/ai-analyze/ask
 * 非流式问答
 */
router.post('/ask', async (req, res) => {
  try {
    const { sessionId, question } = req.body;

    if (!sessionId || !question) {
      return res.status(400).json({ code: -1, message: '缺少参数' });
    }

    const session = analysisSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ code: -1, message: '会话不存在或已过期' });
    }

    const response = [];
    const stream = aiDataAnalyst.analyzeStream(session.csvData, question);

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
 * GET /api/ai-analyze/session/:sessionId
 * 获取会话信息
 */
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = analysisSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ code: -1, message: '会话不存在' });
  }

  res.json({
    code: 0,
    data: {
      sessionId: session.id,
      filename: session.filename,
      totalRows: session.csvData.totalRows,
      headers: session.csvData.headers
    }
  });
});

/**
 * DELETE /api/ai-analyze/session/:sessionId
 * 删除会话
 */
router.delete('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const session = analysisSessions.get(sessionId);

  if (session) {
    // 清理文件
    try {
      await fs.remove(session.filePath);
    } catch (e) {
      // 忽略错误
    }
    analysisSessions.delete(sessionId);
  }

  res.json({ code: 0, message: '已删除' });
});

module.exports = router;
