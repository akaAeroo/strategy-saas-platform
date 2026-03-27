/**
 * 配置管理
 */

require('dotenv').config();

const config = {
  // 服务配置
  port: process.env.PORT || 3001,
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // 公司云端数据API
  audienceApi: {
    url: process.env.AUDIENCE_API_URL || '',
    key: process.env.AUDIENCE_API_KEY || '',
    timeout: parseInt(process.env.AUDIENCE_API_TIMEOUT) || 30000,
  },
  
  // 云端大模型配置
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    
    // OpenAI
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    },
    
    // Anthropic Claude
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
    },
    
    // 百度文心
    baidu: {
      apiKey: process.env.BAIDU_API_KEY || '',
      secretKey: process.env.BAIDU_SECRET_KEY || '',
    },
    
    // 阿里通义
    alibaba: {
      apiKey: process.env.ALIBABA_API_KEY || '',
      model: process.env.ALIBABA_MODEL || 'qwen-max',
    },
    
    // 诊断参数
    diagnosis: {
      temperature: parseFloat(process.env.AI_DIAGNOSIS_TEMPERATURE) || 0.3,
      maxTokens: parseInt(process.env.AI_DIAGNOSIS_MAX_TOKENS) || 2000,
    }
  },
  
  // 数据存储
  dataDir: process.env.DATA_DIR || './diagnoses',
  cacheTtl: parseInt(process.env.CACHE_TTL) || 300,
  
  // 环境
  isDev: process.env.NODE_ENV !== 'production',
};

// 配置验证
function validateConfig() {
  const required = [];
  
  if (!config.audienceApi.url) {
    console.warn('⚠️ 未配置 AUDIENCE_API_URL，将使用模拟数据');
  }
  
  if (!config.audienceApi.key) {
    console.warn('⚠️ 未配置 AUDIENCE_API_KEY，将使用模拟数据');
  }
  
  const aiProvider = config.ai.provider;
  const aiConfig = config.ai[aiProvider];
  
  if (!aiConfig || !aiConfig.apiKey) {
    console.warn(`⚠️ 未配置 ${aiProvider.toUpperCase()} API Key，AI诊断将不可用`);
  }
  
  return required.length === 0;
}

module.exports = { config, validateConfig };
