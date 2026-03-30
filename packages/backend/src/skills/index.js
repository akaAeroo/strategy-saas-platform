/**
 * Skills 模块入口
 * 注册所有 Skill
 */

const SkillRegistry = require('./SkillRegistry');
const DataAnalysisSkill = require('./DataAnalysisSkill');
const WebSearchSkill = require('./WebSearchSkill');
const StrategySkill = require('./StrategySkill');
const ChatSkill = require('./ChatSkill');

// 实例化并注册所有 Skills
const skills = {
  dataAnalysis: new DataAnalysisSkill(),
  webSearch: new WebSearchSkill(),
  strategy: new StrategySkill(),
  chat: new ChatSkill()
};

// 注册到 SkillRegistry
for (const skill of Object.values(skills)) {
  SkillRegistry.register(skill);
}

// 导出
module.exports = {
  SkillRegistry,
  skills,
  BaseSkill: require('./BaseSkill')
};
