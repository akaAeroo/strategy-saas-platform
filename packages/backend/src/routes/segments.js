/**
 * 人群管理路由
 */

const express = require('express');
const router = express.Router();
const audienceService = require('../services/audienceApiService');
const aiService = require('../services/aiService');
const diagnosisService = require('../services/diagnosisService');

/**
 * GET /api/segments
 * 获取人群列表
 */
router.get('/', async (req, res) => {
  try {
    const result = await audienceService.getSegments();
    res.json(result);
  } catch (error) {
    console.error('获取人群列表失败:', error);
    res.status(500).json({
      code: -1,
      message: '获取人群列表失败',
      error: error.message
    });
  }
});

/**
 * GET /api/segments/:id
 * 获取人群详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await audienceService.getSegmentDetail(id);
    res.json(result);
  } catch (error) {
    console.error('获取人群详情失败:', error);
    res.status(500).json({
      code: -1,
      message: '获取人群详情失败',
      error: error.message
    });
  }
});

/**
 * GET /api/segments/:id/metrics
 * 获取人群指标
 */
router.get('/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.query;
    
    const result = await audienceService.getSegmentMetrics(id, { days });
    res.json(result);
  } catch (error) {
    console.error('获取人群指标失败:', error);
    res.status(500).json({
      code: -1,
      message: '获取人群指标失败',
      error: error.message
    });
  }
});

/**
 * GET /api/segments/:id/trend
 * 获取人群趋势
 */
router.get('/:id/trend', async (req, res) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days) || 30;
    
    const result = await audienceService.getSegmentTrend(id, days);
    res.json(result);
  } catch (error) {
    console.error('获取人群趋势失败:', error);
    res.status(500).json({
      code: -1,
      message: '获取人群趋势失败',
      error: error.message
    });
  }
});

/**
 * POST /api/segments/:id/diagnose
 * AI诊断人群
 */
router.post('/:id/diagnose', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. 获取人群信息和指标
    const [segmentResult, metricsResult] = await Promise.all([
      audienceService.getSegmentDetail(id),
      audienceService.getSegmentMetrics(id)
    ]);
    
    if (segmentResult.code !== 0) {
      return res.status(404).json({
        code: -1,
        message: '人群不存在'
      });
    }
    
    const segment = segmentResult.data;
    const metrics = metricsResult.data;
    
    // 2. 调用AI进行诊断
    const diagnosis = await aiService.diagnoseSegment(segment, metrics);
    
    // 3. 保存诊断结果
    await diagnosisService.saveDiagnosis(diagnosis);
    
    res.json({
      code: 0,
      data: diagnosis
    });
    
  } catch (error) {
    console.error('AI诊断失败:', error);
    res.status(500).json({
      code: -1,
      message: 'AI诊断失败',
      error: error.message
    });
  }
});

/**
 * GET /api/segments/:id/diagnosis
 * 获取人群诊断结果
 */
router.get('/:id/diagnosis', async (req, res) => {
  try {
    const { id } = req.params;
    
    const diagnosis = await diagnosisService.getLatestDiagnosis(id);
    
    if (!diagnosis) {
      return res.status(404).json({
        code: -1,
        message: '该人群暂无诊断结果'
      });
    }
    
    res.json({
      code: 0,
      data: diagnosis
    });
    
  } catch (error) {
    console.error('获取诊断结果失败:', error);
    res.status(500).json({
      code: -1,
      message: '获取诊断结果失败',
      error: error.message
    });
  }
});

/**
 * GET /api/segments/:id/diagnosis/history
 * 获取人群诊断历史
 */
router.get('/:id/diagnosis/history', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const history = await diagnosisService.getDiagnosisHistory(id, limit);
    
    res.json({
      code: 0,
      data: history
    });
    
  } catch (error) {
    console.error('获取诊断历史失败:', error);
    res.status(500).json({
      code: -1,
      message: '获取诊断历史失败',
      error: error.message
    });
  }
});

module.exports = router;
