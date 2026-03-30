/**
 * Web Search 路由
 * 网页抓取和全网搜索 API
 */

const express = require('express');
const webSearchService = require('../services/webSearchService');

const router = express.Router();

/**
 * POST /api/web-search/fetch
 * 抓取单个网页
 */
router.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ code: -1, message: '缺少 URL 参数' });
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ code: -1, message: '无效的 URL 格式' });
    }

    const result = await webSearchService.fetchWebPage(url);

    if (result.success) {
      res.json({ code: 0, data: result });
    } else {
      res.status(500).json({ code: -1, message: result.error, data: result });
    }
  } catch (error) {
    console.error('抓取网页错误:', error);
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * GET /api/web-search/search
 * 搜索引擎查询
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q) {
      return res.status(400).json({ code: -1, message: '缺少搜索关键词 q' });
    }

    const result = await webSearchService.search(q, parseInt(limit));
    res.json({ code: 0, data: result });

  } catch (error) {
    console.error('搜索错误:', error);
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * GET /api/web-search/deep-search
 * 深度搜索（搜索 + 抓取）
 */
router.get('/deep-search', async (req, res) => {
  try {
    const { 
      q, 
      searchLimit = 5, 
      fetchLimit = 3 
    } = req.query;

    if (!q) {
      return res.status(400).json({ code: -1, message: '缺少搜索关键词 q' });
    }

    const result = await webSearchService.deepSearch(
      q, 
      parseInt(searchLimit), 
      parseInt(fetchLimit)
    );

    res.json({ code: 0, data: result });

  } catch (error) {
    console.error('深度搜索错误:', error);
    res.status(500).json({ code: -1, message: error.message });
  }
});

/**
 * GET /api/web-search/stream-analyze
 * 流式 AI 分析搜索结果（SSE）
 */
router.get('/stream-analyze', async (req, res) => {
  try {
    const { q, question } = req.query;

    if (!q) {
      return res.status(400).json({ code: -1, message: '缺少搜索关键词 q' });
    }

    // 1. 先执行深度搜索
    const searchData = await webSearchService.deepSearch(q, 5, 3);

    if (!searchData.success) {
      return res.status(500).json({ 
        code: -1, 
        message: searchData.error || '搜索失败',
        data: searchData
      });
    }

    // 2. 设置 SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 3. 流式 AI 分析
    const stream = webSearchService.analyzeStream(q, searchData, question);

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
 * POST /api/web-search/analyze-url
 * 抓取并分析单个 URL
 */
router.post('/analyze-url', async (req, res) => {
  try {
    const { url, question } = req.body;

    if (!url) {
      return res.status(400).json({ code: -1, message: '缺少 URL 参数' });
    }

    // 抓取网页
    const fetchResult = await webSearchService.fetchWebPage(url);

    if (!fetchResult.success) {
      return res.status(500).json({ 
        code: -1, 
        message: fetchResult.error,
        data: fetchResult 
      });
    }

    // 构造搜索数据格式
    const searchData = {
      success: true,
      query: url,
      searchResults: [{
        title: fetchResult.title,
        url: fetchResult.url,
        snippet: fetchResult.description
      }],
      fetchedPages: [fetchResult]
    };

    // 流式返回 AI 分析
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = webSearchService.analyzeStream(url, searchData, question);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('分析 URL 错误:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/web-search/status
 * 检查搜索服务状态
 */
router.get('/status', (req, res) => {
  const hasBingKey = !!process.env.BING_SEARCH_KEY;
  const hasSerpApiKey = !!process.env.SERPAPI_KEY;
  
  res.json({
    code: 0,
    data: {
      available: hasBingKey || hasSerpApiKey,
      engines: {
        bing: hasBingKey,
        google: hasSerpApiKey
      },
      features: {
        search: hasBingKey || hasSerpApiKey,
        fetch: true, // 网页抓取始终可用
        deepSearch: hasBingKey || hasSerpApiKey
      }
    }
  });
});

module.exports = router;
