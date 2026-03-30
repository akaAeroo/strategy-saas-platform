/**
 * 数据分析 Agent
 * 分析上传的数据文件，生成洞察
 */

const BaseAgent = require('../BaseAgent');
const { getAgentSkills } = require('../skills');

class DataAnalysisAgent extends BaseAgent {
  constructor() {
    super({
      id: 'data_analysis',
      name: '数据分析',
      description: '分析Excel/CSV数据文件，生成数据洞察和可视化建议',
      icon: '📈',
      color: '#10b981',
      category: 'analysis'
    });

    // 加载 Skills
    this.skills = getAgentSkills(this.id);
    
    // 初始化技能映射
    this.skillMap = {};
    for (const skill of this.skills) {
      this.skillMap[skill.id] = skill;
    }
  }

  canHandle(input) {
    if (input.fileId || input.file) return 0.95;
    const keywords = ['分析', '数据', 'Excel', 'CSV', '统计', '可视化', '洞察'];
    return keywords.some(kw => (input.question || '').includes(kw)) ? 0.85 : 0.3;
  }

  getCapabilitiesDescription() {
    return `- 解析 Excel/CSV 数据文件
- 执行统计分析和计算
- 生成数据可视化图表
- 发现数据洞察和异常
- 提供业务建议`;
  }

  async *execute(input, context = {}) {
    const { question, fileId, filePath, data } = input;
    let hasSentContent = false; // 追踪是否发送过内容

    // 如果有文件，先解析
    if (filePath || fileId) {
      yield { type: 'content', data: '正在解析数据文件...\n\n' };
      hasSentContent = true;
      
      try {
        const fileSkill = this.skillMap['file_parse'];
        if (fileSkill) {
          const parseResult = await fileSkill.execute({ 
            filePath: filePath || `/tmp/${fileId}`,
            maxRows: 1000 
          });
          
          yield { 
            type: 'content', 
            data: `✅ 解析完成：${parseResult.summary.totalRows} 行数据，${parseResult.summary.columnCount} 个字段\n\n` 
          };

          // 保存到上下文
          context.parsedData = parseResult;
          
          // 显示数据预览
          yield { 
            type: 'content', 
            data: `**字段信息：**\n${parseResult.summary.columns.map(col => 
              `- ${col.name} (${col.type})`
            ).join('\n')}\n\n` 
          };
        }
      } catch (error) {
        yield { type: 'error', data: `文件解析失败：${error.message}` };
        return;
      }
    }

    // 执行统计分析
    if (question?.includes('统计') || question?.includes('分析') || context.parsedData) {
      yield { type: 'content', data: '🔍 正在执行统计分析...\n\n' };
      
      try {
        const statSkill = this.skillMap['statistical_analysis'];
        
        if (statSkill && context.parsedData) {
          const statResult = await statSkill.execute({
            data: context.parsedData.rows,
            columns: context.parsedData.summary.columns.map(c => c.name)
          });

          yield { 
            type: 'content', 
            data: `**统计摘要：**\n\n` 
          };

          for (const [col, stats] of Object.entries(statResult.columnStats)) {
            if (stats.numeric) {
              yield {
                type: 'content',
                data: `**${col}**：均值 ${stats.numeric.mean}，中位数 ${stats.numeric.median}，标准差 ${stats.numeric.stdDev}\n`
              };
            }
          }
          yield { type: 'content', data: '\n' };
        }

        // 使用 LLM 生成深度洞察
        yield { type: 'content', data: '💡 正在使用AI生成深度洞察...\n\n' };
        
        const systemPrompt = `你是一位资深数据分析师，擅长从数据中发现洞察和趋势。
要求：
1. 分析要客观、准确、有深度
2. 提供可执行的洞察和建议
3. 使用中文回复
4. 格式清晰，使用Markdown
5. 突出关键发现和异常`;

        const prompt = `请分析以下数据并生成洞察报告：

数据概览：
- 总行数：${context.parsedData?.summary?.totalRows || '未知'}
- 字段：${context.parsedData?.summary?.columns?.map(c => c.name).join(', ') || '未知'}

数据样本（前20行）：
${JSON.stringify(context.parsedData?.rows?.slice(0, 20) || [], null, 2)}

请提供：
1. 数据概览和关键指标
2. 主要发现和洞察（至少3点）
3. 异常检测和数据质量问题（如有）
4. 可执行的业务建议`;

        let llmResponse = '';
        for await (const chunk of this.callLLM(systemPrompt, [{ role: 'user', content: prompt }])) {
          llmResponse += chunk;
          yield { type: 'content', data: chunk };
        }
        
        yield { type: 'content', data: '\n\n' };
        
        hasSentContent = true;

      } catch (error) {
        yield { type: 'error', data: `分析失败：${error.message}` };
      }
    }

    // 生成可视化
    if (question?.includes('可视化') || question?.includes('图表') || question?.includes('画图')) {
      yield { type: 'content', data: '📊 正在生成可视化...\n\n' };
      
      try {
        const vizSkill = this.skillMap['data_visualization'];
        
        if (vizSkill && context.parsedData) {
          // 转换数据格式
          const chartData = context.parsedData.rows.slice(0, 100).map((row, i) => {
            const obj = {};
            context.parsedData.headers.forEach((h, idx) => {
              obj[h] = row[idx];
            });
            return obj;
          });

          const vizResult = await vizSkill.execute({
            data: chartData,
            chartType: 'auto',
            title: '数据分析图表'
          });

          yield {
            type: 'visualization',
            data: vizResult.chartConfig
          };

          if (vizResult.recommendations.length > 0) {
            yield {
              type: 'content',
              data: `\n💡 ${vizResult.recommendations[0].message}\n`
            };
          }
        }
      } catch (error) {
        yield { type: 'error', data: `可视化失败：${error.message}` };
      }
    }

    // 默认回复 - 如果没有匹配任何条件且没有发送过内容
    if (!hasSentContent && !question?.includes('统计') && !question?.includes('分析') && 
        !question?.includes('可视化') && !question?.includes('图表') && !filePath && !fileId) {
      yield { 
        type: 'content', 
        data: `你好！我是数据分析助手，可以帮助你：

📊 **数据分析**
• 上传 Excel/CSV 文件进行分析
• 生成统计报告（均值、中位数、标准差等）
• 发现数据洞察和异常

📈 **可视化**
• 自动生成图表（折线图、柱状图、饼图等）
• 支持多种图表类型

💡 **使用方法**
1. 直接上传数据文件，我会自动分析
2. 输入"分析数据"或"生成报告"获取详细分析
3. 输入"可视化"创建数据图表

有什么可以帮你的吗？` 
      };
      hasSentContent = true;
    }

    // 记录对话到记忆
    const fullResponse = '分析完成';
    await this.recordConversation(question || '数据分析', fullResponse, {
      important: true,
      hasFile: !!fileId,
      dataSummary: context.parsedData?.summary
    });

    yield { type: 'complete', data: { success: true } };
  }

  getQuickActions() {
    return [
      { label: '📊 分析数据文件', prompt: '分析上传的数据文件' },
      { label: '📈 生成统计报告', prompt: '生成数据统计分析报告' },
      { label: '💡 发现洞察', prompt: '分析数据并发现关键洞察' },
      { label: '📉 创建可视化', prompt: '创建数据可视化图表' }
    ];
  }
}

module.exports = DataAnalysisAgent;
