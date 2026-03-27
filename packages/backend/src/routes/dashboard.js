/**
 * 仪表盘路由
 */

const express = require('express');
const router = express.Router();
const audienceService = require('../services/audienceApiService');
const diagnosisService = require('../services/diagnosisService');

/**
 * GET /api/dashboard/stats
 * 获取仪表盘统计数据
 */
router.get('/stats', async (req, res) => {
  try {
    // 获取人群列表
    const segmentsResult = await audienceService.getSegments();
    const segments = segmentsResult.data || [];
    
    // 获取诊断统计
    const diagnosisStats = await diagnosisService.getDiagnosisStats();
    
    // 获取最近的诊断
    const latestDiagnoses = await diagnosisService.getAllLatestDiagnoses();
    
    // 计算总人群规模
    const totalScale = segments.reduce((sum, s) => sum + (s.scale || 0), 0);
    
    res.json({
      code: 0,
      data: {
        // 人群统计
        segment_count: segments.length,
        total_users: totalScale,
        
        // 诊断统计
        diagnosis_stats: {
          total: diagnosisStats.total_diagnoses,
          avg_health_score: diagnosisStats.avg_health_score,
          critical: diagnosisStats.critical_count,
          warning: diagnosisStats.warning_count,
          good: diagnosisStats.good_count
        },
        
        // 最近诊断
        recent_diagnoses: latestDiagnoses.slice(0, 5),
        
        // 人群列表
        segments: segments.map(s => ({
          id: s.id,
          name: s.name,
          level: s.level,
          scale: s.scale,
          health_score: latestDiagnoses.find(d => d.segment_id === s.id)?.health_score || null
        }))
      }
    });
    
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    res.status(500).json({
      code: -1,
      message: '获取仪表盘数据失败',
      error: error.message
    });
  }
});

module.exports = router;
