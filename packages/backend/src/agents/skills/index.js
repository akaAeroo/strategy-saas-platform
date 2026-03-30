/**
 * Skills 索引
 * 导出所有 Skill 类
 */

const BaseSkill = require('./BaseSkill');

// Data Skills
const FileParseSkill = require('./data/FileParseSkill');
const StatisticalAnalysisSkill = require('./data/StatisticalAnalysisSkill');
const DataVisualizationSkill = require('./data/DataVisualizationSkill');
const InsightGenerationSkill = require('./data/InsightGenerationSkill');

// Analysis Skills
const TrendAnalysisSkill = require('./analysis/TrendAnalysisSkill');
const AlertGenerationSkill = require('./analysis/AlertGenerationSkill');

// Content Skills
const ContentGenerationSkill = require('./content/ContentGenerationSkill');
const TitleGenerationSkill = require('./content/TitleGenerationSkill');

// Web Skills
const WebScrapeSkill = require('./web/WebScrapeSkill');
const PriceCompareSkill = require('./web/PriceCompareSkill');

// Skill 注册表
const skillRegistry = {
  // Data Analysis
  file_parse: FileParseSkill,
  statistical_analysis: StatisticalAnalysisSkill,
  data_visualization: DataVisualizationSkill,
  insight_generation: InsightGenerationSkill,
  
  // Analysis
  trend_analysis: TrendAnalysisSkill,
  alert_generation: AlertGenerationSkill,
  
  // Content
  content_generation: ContentGenerationSkill,
  title_generation: TitleGenerationSkill,
  
  // Web
  web_scrape: WebScrapeSkill,
  price_compare: PriceCompareSkill
};

/**
 * 创建 Skill 实例
 * @param {string} skillId - Skill ID
 * @param {string} agentId - Agent ID
 * @returns {BaseSkill|null}
 */
function createSkill(skillId, agentId) {
  const SkillClass = skillRegistry[skillId];
  if (!SkillClass) {
    console.warn(`Skill not found: ${skillId}`);
    return null;
  }
  return new SkillClass(agentId);
}

/**
 * 获取 Agent 的 Skills
 * @param {string} agentId - Agent ID
 * @returns {BaseSkill[]}
 */
function getAgentSkills(agentId) {
  const agentSkillMap = {
    data_analysis: [
      'file_parse',
      'statistical_analysis',
      'data_visualization',
      'insight_generation'
    ],
    audience_dashboard: [
      'trend_analysis',
      'alert_generation',
      'statistical_analysis',
      'insight_generation'
    ],
    content_template: [
      'content_generation',
      'title_generation'
    ],
    price_monitoring: [
      'web_scrape',
      'price_compare',
      'trend_analysis'
    ],
    title_generation: [
      'title_generation',
      'content_generation'
    ]
  };

  const skillIds = agentSkillMap[agentId] || [];
  return skillIds.map(id => createSkill(id, agentId)).filter(Boolean);
}

/**
 * 获取所有可用 Skills
 * @returns {Object}
 */
function getAllSkills() {
  return Object.entries(skillRegistry).map(([id, SkillClass]) => {
    const instance = new SkillClass('system');
    return {
      id,
      name: instance.name,
      description: instance.description,
      icon: instance.icon,
      category: instance.category
    };
  });
}

module.exports = {
  BaseSkill,
  
  // Data
  FileParseSkill,
  StatisticalAnalysisSkill,
  DataVisualizationSkill,
  InsightGenerationSkill,
  
  // Analysis
  TrendAnalysisSkill,
  AlertGenerationSkill,
  
  // Content
  ContentGenerationSkill,
  TitleGenerationSkill,
  
  // Web
  WebScrapeSkill,
  PriceCompareSkill,
  
  // Functions
  createSkill,
  getAgentSkills,
  getAllSkills,
  skillRegistry
};
