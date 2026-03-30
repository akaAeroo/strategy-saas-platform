/**
 * AI Data Analyst Skill
 * 让 AI 直接处理原始表格数据，进行智能分析
 */

const xlsx = require('xlsx');
const fs = require('fs-extra');
const path = require('path');
const { config } = require('../config');
const axios = require('axios');

class AIDataAnalyst {
  constructor() {
    this.provider = config.ai.provider;
    this.aiConfig = config.ai[this.provider];
  }

  /**
   * 系统提示词 - 数据分析师角色
   */
  getSystemPrompt() {
    return `你是智能策略平台的 AI 数据分析师，擅长处理和分析用户数据表格。

## 核心能力
1. **数据解析**：理解 CSV/Excel 格式的原始数据，识别列含义
2. **数据清洗**：发现缺失值、异常值、重复数据
3. **统计分析**：计算分布、占比、趋势等统计指标
4. **人群洞察**：基于数据特征识别用户分群
5. **策略建议**：根据数据特点提出运营策略

## 输出规范
- 使用 Markdown 表格展示统计结果
- 关键数字用 **加粗** 标注
- 分析结论分点列出，使用 emoji 增强可读性
- 涉及人数时，使用千分位格式（如 12,500）

## 数据处理原则
- 遇到缺失值时标注并建议处理方式
- 识别并标注异常数据点
- 对文本标签进行归类统计
- 数值字段计算分布区间

## 响应格式示例
**数据概览**
- 总记录数：**10,000** 条
- 字段数：15 列
- 关键字段：用户ID、注册时间、价值等级...

**分布统计**
| 价值等级 | 人数 | 占比 |
|---------|------|------|
| 高价值 | 2,500 | 25% |
| 中价值 | 5,000 | 50% |
| 低价值 | 2,500 | 25% |

**主要发现**
1. 📊 高价值用户占比 25%，建议重点维护
2. ⚠️ 发现 300 条手机号格式异常
3. 💡 北京、上海用户占 40%，可针对一线城市做活动`;
  }

  /**
   * 解析表格文件为 CSV 文本（供 AI 分析）
   * 正确处理 UTF-8 编码
   */
  async parseFileToCSV(filePath, maxRows = 1000) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      let data = [];

      if (ext === '.csv') {
        // CSV 文件：直接读取并解析，确保 UTF-8 编码
        const content = await fs.readFile(filePath, 'utf-8');
        data = this.parseCSVContent(content);
      } else {
        // Excel 文件：使用 xlsx 库
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      }
      
      if (data.length < 2) {
        throw new Error('数据不足，至少需要表头和一行数据');
      }

      const headers = data[0];
      const rows = data.slice(1, maxRows + 1);

      // 转换为 CSV 格式文本
      const csvLines = [
        headers.join(','),
        ...rows.map(row => 
          headers.map((_, i) => {
            const val = row[i];
            if (val === undefined || val === null) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',')
        )
      ];

      return {
        headers,
        totalRows: data.length - 1,
        sampledRows: rows.length,
        csvContent: csvLines.join('\n'),
        isSampled: data.length - 1 > maxRows
      };
    } catch (error) {
      console.error('解析文件失败:', error);
      throw error;
    }
  }

  /**
   * 解析 CSV 内容（正确处理 UTF-8 和引号）
   */
  parseCSVContent(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const result = [];

    for (const line of lines) {
      const row = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // 转义的引号
            current += '"';
            i++;
          } else {
            // 切换引号状态
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      // 添加最后一个字段
      row.push(current.trim());
      result.push(row);
    }

    return result;
  }

  /**
   * 流式数据分析对话
   */
  async *analyzeStream(csvData, userQuestion = null) {
    const prompt = this._buildAnalysisPrompt(csvData, userQuestion);
    
    try {
      if (this.provider === 'opencode' || this.provider === 'openai') {
        yield* this._streamAnalysis(prompt);
      } else {
        // 非流式回退
        const response = await this._callAI(prompt);
        yield { type: 'content', data: response };
      }
      yield { type: 'done' };
    } catch (error) {
      console.error('AI 分析失败:', error);
      yield { type: 'error', data: error.message };
    }
  }

  /**
   * 构建分析 Prompt
   */
  _buildAnalysisPrompt(csvData, userQuestion) {
    const { headers, totalRows, sampledRows, csvContent, isSampled } = csvData;
    
    let prompt = `请分析以下用户数据表格：

## 数据信息
- 总记录数：${totalRows.toLocaleString()} 条
- 本次分析样本：${sampledRows.toLocaleString()} 条${isSampled ? '（已采样）' : ''}
- 字段数：${headers.length} 列
- 字段列表：${headers.join('、')}

## 原始数据（CSV 格式）
\`\`\`csv
${csvContent}
\`\`\`
`;

    if (userQuestion) {
      prompt += `\n## 用户问题\n${userQuestion}\n`;
    } else {
      prompt += `\n## 任务\n请提供：\n1. 数据概览（总记录数、字段说明）\n2. 各字段的分布统计\n3. 数据质量评估（缺失值、异常值）\n4. 基于数据的运营建议\n`;
    }

    return prompt;
  }

  /**
   * 流式调用 AI
   */
  async *_streamAnalysis(prompt) {
    const requestBody = {
      model: this.aiConfig.model,
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      stream: true
    };

    // OpenCode 支持 provider_id
    if (this.provider === 'opencode' && this.aiConfig.providerId) {
      requestBody.provider_id = this.aiConfig.providerId;
    }

    const response = await axios.post(
      `${this.aiConfig.baseUrl}/chat/completions`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${this.aiConfig.apiKey}`,
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
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }

  /**
   * 非流式调用 AI
   */
  async _callAI(prompt) {
    const requestBody = {
      model: this.aiConfig.model,
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    };

    if (this.provider === 'opencode' && this.aiConfig.providerId) {
      requestBody.provider_id = this.aiConfig.providerId;
    }

    const response = await axios.post(
      `${this.aiConfig.baseUrl}/chat/completions`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${this.aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }
}

module.exports = new AIDataAnalyst();
