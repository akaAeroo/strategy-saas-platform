/**
 * 诊断结果存储服务
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { config } = require('../config');

class DiagnosisService {
  constructor() {
    this.dataDir = config.dataDir;
    this.ensureDataDir();
  }

  async ensureDataDir() {
    await fs.ensureDir(this.dataDir);
  }

  /**
   * 保存诊断结果
   */
  async saveDiagnosis(diagnosis) {
    const filename = `${diagnosis.segment_id}_${Date.now()}.json`;
    const filepath = path.join(this.dataDir, filename);
    
    await fs.writeJson(filepath, diagnosis, { spaces: 2 });
    
    // 同时保存为最新诊断
    const latestPath = path.join(this.dataDir, `${diagnosis.segment_id}_latest.json`);
    await fs.writeJson(latestPath, diagnosis, { spaces: 2 });
    
    return {
      id: uuidv4(),
      filename,
      saved_at: new Date().toISOString()
    };
  }

  /**
   * 获取人群的最新诊断
   */
  async getLatestDiagnosis(segmentId) {
    const latestPath = path.join(this.dataDir, `${segmentId}_latest.json`);
    
    if (await fs.pathExists(latestPath)) {
      return await fs.readJson(latestPath);
    }
    
    // 查找该人群的所有诊断
    const files = await fs.readdir(this.dataDir);
    const segmentFiles = files.filter(f => f.startsWith(`${segmentId}_`) && f.endsWith('.json'));
    
    if (segmentFiles.length === 0) {
      return null;
    }
    
    // 按时间排序，返回最新的
    segmentFiles.sort().reverse();
    return await fs.readJson(path.join(this.dataDir, segmentFiles[0]));
  }

  /**
   * 获取人群诊断历史
   */
  async getDiagnosisHistory(segmentId, limit = 10) {
    const files = await fs.readdir(this.dataDir);
    const segmentFiles = files
      .filter(f => f.startsWith(`${segmentId}_`) && f.endsWith('.json') && !f.includes('_latest'))
      .sort()
      .reverse()
      .slice(0, limit);
    
    const diagnoses = [];
    for (const file of segmentFiles) {
      const data = await fs.readJson(path.join(this.dataDir, file));
      diagnoses.push(data);
    }
    
    return diagnoses;
  }

  /**
   * 获取所有诊断统计
   */
  async getDiagnosisStats() {
    const files = await fs.readdir(this.dataDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('_latest'));
    
    const stats = {
      total_diagnoses: jsonFiles.length,
      segments_diagnosed: new Set(),
      avg_health_score: 0,
      critical_count: 0,
      warning_count: 0,
      good_count: 0
    };
    
    let totalScore = 0;
    let scoreCount = 0;
    
    for (const file of jsonFiles.slice(-100)) { // 最近100条
      try {
        const data = await fs.readJson(path.join(this.dataDir, file));
        stats.segments_diagnosed.add(data.segment_id);
        
        if (data.health_score !== undefined) {
          totalScore += data.health_score;
          scoreCount++;
        }
        
        if (data.health_level === 'critical') stats.critical_count++;
        else if (data.health_level === 'warning') stats.warning_count++;
        else if (data.health_level === 'good' || data.health_level === 'excellent') {
          stats.good_count++;
        }
      } catch (e) {
        // 忽略错误文件
      }
    }
    
    stats.segments_diagnosed = stats.segments_diagnosed.size;
    stats.avg_health_score = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
    
    return stats;
  }

  /**
   * 获取最近所有人群的诊断
   */
  async getAllLatestDiagnoses() {
    const files = await fs.readdir(this.dataDir);
    const latestFiles = files.filter(f => f.endsWith('_latest.json'));
    
    const diagnoses = [];
    for (const file of latestFiles) {
      try {
        const data = await fs.readJson(path.join(this.dataDir, file));
        diagnoses.push(data);
      } catch (e) {
        // 忽略错误文件
      }
    }
    
    return diagnoses;
  }
}

module.exports = new DiagnosisService();
