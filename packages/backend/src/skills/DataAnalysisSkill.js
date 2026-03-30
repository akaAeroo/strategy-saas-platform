/**
 * 数据分析 Skill
 * 解析 Excel/CSV 并生成统计洞察
 */

const BaseSkill = require('./BaseSkill');
const xlsx = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

class DataAnalysisSkill extends BaseSkill {
  constructor(agentId) {
    super({
      id: 'data_analysis',
      name: '数据分析',
      description: '解析数据文件并生成统计分析',
      icon: '📊',
      agentId,
      inputSchema: {
        filePath: { type: 'string', required: true },
        maxRows: { type: 'number', required: false }
      },
      outputSchema: {
        headers: { type: 'array' },
        statistics: { type: 'object' },
        insights: { type: 'array' }
      }
    });
  }

  async execute(input, context = {}) {
    const startTime = Date.now();
    
    try {
      const { filePath, maxRows = 1000 } = input;
      
      if (!await fs.pathExists(filePath)) {
        throw new Error('文件不存在');
      }

      const ext = path.extname(filePath).toLowerCase();
      let data = [];

      if (ext === '.csv') {
        const content = await fs.readFile(filePath, 'utf-8');
        data = this.parseCSV(content);
      } else {
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      }

      const headers = data[0] || [];
      const rows = data.slice(1, maxRows + 1);

      // 统计分析
      const statistics = {};
      for (let i = 0; i < headers.length; i++) {
        const col = headers[i];
        const values = rows.map(r => r[i]).filter(v => v !== undefined && v !== '');
        statistics[col] = this.analyzeColumn(values);
      }

      // 生成洞察
      const insights = this.generateInsights(headers, rows, statistics);

      this.recordExecution(Date.now() - startTime);

      return {
        headers,
        rowCount: rows.length,
        statistics,
        insights,
        preview: rows.slice(0, 5)
      };

    } catch (error) {
      throw new Error(`数据分析失败: ${error.message}`);
    }
  }

  parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  }

  analyzeColumn(values) {
    const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
    
    const result = {
      count: values.length,
      unique: new Set(values).size,
      type: numericValues.length > values.length * 0.8 ? 'numeric' : 'text'
    };

    if (result.type === 'numeric' && numericValues.length > 0) {
      const sorted = numericValues.sort((a, b) => a - b);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      
      result.numeric = {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: Number((sum / numericValues.length).toFixed(2)),
        median: sorted[Math.floor(sorted.length / 2)]
      };
    }

    return result;
  }

  generateInsights(headers, rows, statistics) {
    const insights = [];
    
    // 检查高缺失率
    for (const [col, stat] of Object.entries(statistics)) {
      if (stat.unique / stat.count > 0.9) {
        insights.push({
          type: 'info',
          message: `【${col}】几乎是唯一值，可能是ID列`
        });
      }
    }

    return insights;
  }
}

module.exports = DataAnalysisSkill;
