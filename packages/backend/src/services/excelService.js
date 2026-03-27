/**
 * Excel 解析服务
 */

const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');

// 临时存储目录
const TEMP_DIR = path.join(__dirname, '../../temp');

// 确保目录存在
fs.ensureDirSync(TEMP_DIR);

class ExcelService {
  /**
   * 解析 Excel 文件
   */
  async parseExcel(filePath) {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // 转换为 JSON
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (data.length < 2) {
        throw new Error('Excel 文件数据不足，至少需要表头和一行数据');
      }
      
      // 第一行作为表头
      const headers = data[0].map(h => String(h).trim());
      
      // 识别列类型
      const columnMapping = this._detectColumnTypes(headers);
      
      // 解析数据行
      const rows = data.slice(1).map((row, index) => {
        const obj = {};
        headers.forEach((header, i) => {
          const key = columnMapping[header] || `column_${i}`;
          obj[key] = row[i] !== undefined ? row[i] : null;
        });
        obj._rowIndex = index + 2; // 行号（从2开始，因为1是表头）
        return obj;
      }).filter(row => Object.values(row).some(v => v !== null)); // 过滤空行
      
      return {
        uploadId: uuidv4(),
        totalRows: rows.length,
        headers,
        columnMapping,
        preview: rows.slice(0, 10), // 前10行预览
        allData: rows
      };
    } catch (error) {
      console.error('解析 Excel 失败:', error);
      throw error;
    }
  }

  /**
   * 智能识别列类型
   */
  _detectColumnTypes(headers) {
    const mapping = {};
    
    const patterns = {
      user_id: [/用户id|userid|用户id|uid|id/i],
      phone: [/手机|电话|phone|tel|手机号/i],
      email: [/邮箱|email|邮件/i],
      name: [/姓名|名字|昵称|name|username/i],
      value_level: [/价值|等级|level|价值等级|用户等级/i],
      tags: [/标签|tag|tags|用户标签/i],
      last_active: [/最后活跃|最近活跃|last_active|活跃时间/i],
      register_date: [/注册|注册时间|注册日期|register|create_time/i],
      gender: [/性别|gender|sex/i],
      age: [/年龄|age/i],
      city: [/城市|city|地区/i],
      source: [/来源|渠道|source|channel/i]
    };
    
    headers.forEach(header => {
      for (const [key, regexes] of Object.entries(patterns)) {
        if (regexes.some(regex => regex.test(header))) {
          mapping[header] = key;
          break;
        }
      }
      if (!mapping[header]) {
        mapping[header] = header; // 保持原样
      }
    });
    
    return mapping;
  }

  /**
   * 生成人群数据摘要（用于AI分析）
   */
  generateDataSummary(data) {
    const { allData, columnMapping } = data;
    const total = allData.length;
    
    // 统计各字段
    const summary = {
      totalUsers: total,
      fields: Object.keys(columnMapping).map(k => ({
        original: k,
        mapped: columnMapping[k]
      })),
      statistics: {}
    };
    
    // 价值等级分布
    if (columnMapping['价值等级'] || columnMapping['value_level']) {
      const key = columnMapping['价值等级'] || columnMapping['value_level'];
      const levels = {};
      allData.forEach(row => {
        const val = row[key];
        if (val) {
          levels[val] = (levels[val] || 0) + 1;
        }
      });
      summary.statistics.valueLevelDistribution = levels;
    }
    
    // 标签统计
    if (columnMapping['标签'] || columnMapping['tags']) {
      const key = columnMapping['标签'] || columnMapping['tags'];
      const tagCounts = {};
      allData.forEach(row => {
        const tags = String(row[key] || '').split(/[,，]/).filter(t => t.trim());
        tags.forEach(tag => {
          tagCounts[tag.trim()] = (tagCounts[tag.trim()] || 0) + 1;
        });
      });
      summary.statistics.topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    }
    
    // 城市分布
    if (columnMapping['城市'] || columnMapping['city']) {
      const key = columnMapping['城市'] || columnMapping['city'];
      const cities = {};
      allData.forEach(row => {
        const val = row[key];
        if (val) {
          cities[val] = (cities[val] || 0) + 1;
        }
      });
      summary.statistics.cityDistribution = Object.entries(cities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    }
    
    return summary;
  }

  /**
   * 保存上传的文件
   */
  async saveFile(buffer, filename) {
    const uploadId = uuidv4();
    const filePath = path.join(TEMP_DIR, `${uploadId}_${filename}`);
    await fs.writeFile(filePath, buffer);
    return { uploadId, filePath };
  }

  /**
   * 清理临时文件
   */
  async cleanup(filePath) {
    try {
      await fs.remove(filePath);
    } catch (e) {
      // 忽略错误
    }
  }
}

module.exports = new ExcelService();
