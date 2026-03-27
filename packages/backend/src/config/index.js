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
    provider: process.env.AI_PROVIDER || 'minimax',
    
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
    
    // Kimi (Moonshot)
    moonshot: {
      apiKey: process.env.MOONSHOT_API_KEY || '',
      baseUrl: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1',
      model: process.env.MOONSHOT_MODEL || 'moonshot-v1-128k',
    },
    
    // 智谱 AI (ChatGLM)
    zhipu: {
      apiKey: process.env.ZHIPU_API_KEY || '',
      baseUrl: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      model: process.env.ZHIPU_MODEL || 'glm-4',
    },
    
    // MiniMax
    minimax: {
      apiKey: process.env.MINIMAX_API_KEY || '',
      groupId: process.env.MINIMAX_GROUP_ID || '',
      baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1',
      model: process.env.MINIMAX_MODEL || 'MiniMax-Text-01',
    },
    
    // 量化派 OpenCode - 星探·源曦 (本地部署)
    opencode: {
      apiKey: process.env.OPENCODE_API_KEY || '',
      baseUrl: process.env.OPENCODE_BASE_URL || 'http://localhost:8000/v1',
      model: process.env.OPENCODE_MODEL || 'xingtan',
    },
    
    // 本地 Ollama
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2',
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
  
  // 本地模型不需要 API Key
  if (aiProvider === 'ollama') {
    console.log(`✅ 使用本地模型: ${aiConfig.model} @ ${aiConfig.baseUrl}`);
  } else if (aiProvider === 'opencode') {
    if (!aiConfig.apiKey) {
      console.warn(`⚠️ 未配置 OPENCODE API Key，请运行配置脚本设置`);
    } else {
      console.log(`✅ 使用量化派 OpenCode: ${aiConfig.model} @ ${aiConfig.baseUrl}`);
    }
  } else if (!aiConfig || !aiConfig.apiKey) {
    console.warn(`⚠️ 未配置 ${aiProvider.toUpperCase()} API Key，AI诊断将不可用`);
  }
  
  return required.length === 0;
}

module.exports = { config, validateConfig };
