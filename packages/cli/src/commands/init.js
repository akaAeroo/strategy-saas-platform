/**
 * Init 命令 - 初始化项目
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

const ROOT_DIR = path.resolve(__dirname, '../../../..');

async function registerInitCommand(name, options) {
  console.log(chalk.blue(`\n🚀 初始化项目: ${name}\n`));
  
  // 交互式配置
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'role',
      message: '请选择您的角色:',
      choices: [
        { name: '🔧 后端开发', value: 'backend' },
        { name: '💻 前端开发', value: 'frontend' },
        { name: '👔 运营/产品', value: 'operator' },
        { name: '🧪 测试', value: 'qa' }
      ],
      when: !options.role
    },
    {
      type: 'input',
      name: 'audienceApiUrl',
      message: '公司数据API地址:',
      default: 'https://your-company-api.com'
    },
    {
      type: 'password',
      name: 'audienceApiKey',
      message: '数据API密钥:',
      mask: '*'
    },
    {
      type: 'list',
      name: 'aiProvider',
      message: '选择AI模型提供商:',
      choices: [
        { name: 'OpenAI (GPT-4)', value: 'openai' },
        { name: 'Anthropic (Claude)', value: 'anthropic' },
        { name: 'Kimi / Kimi Code (Moonshot)', value: 'moonshot' },
        { name: 'MiniMax', value: 'minimax' },
        { name: '🏢 量化派 OpenCode (星探·源曦)', value: 'opencode' },
        { name: '智谱 AI (ChatGLM)', value: 'zhipu' },
        { name: '百度文心一言', value: 'baidu' },
        { name: '阿里通义千问', value: 'alibaba' },
        { name: '🖥️  本地模型 (Ollama)', value: 'ollama' }
      ],
      default: 'openai'
    },
    {
      type: 'password',
      name: 'aiApiKey',
      message: 'AI API密钥 (本地模型无需填写):',
      mask: '*',
      when: (answers) => answers.aiProvider !== 'ollama'
    },
    {
      type: 'input',
      name: 'ollamaUrl',
      message: 'Ollama 服务地址:',
      default: 'http://localhost:11434',
      when: (answers) => answers.aiProvider === 'ollama'
    },
    {
      type: 'input',
      name: 'ollamaModel',
      message: 'Ollama 模型名称:',
      default: 'llama2',
      when: (answers) => answers.aiProvider === 'ollama'
    }
  ]);
  
  const config = {
    role: options.role || answers.role,
    audienceApiUrl: answers.audienceApiUrl,
    audienceApiKey: answers.audienceApiKey,
    aiProvider: answers.aiProvider,
    aiApiKey: answers.aiApiKey || '',
    ollamaUrl: answers.ollamaUrl || 'http://localhost:11434',
    ollamaModel: answers.ollamaModel || 'llama2'
  };
  
  // 生成后端 .env 文件
  const envContent = `# 智能策略平台配置
# 生成时间: ${new Date().toISOString()}

PORT=3001

# 公司数据API
AUDIENCE_API_URL=${config.audienceApiUrl}
AUDIENCE_API_KEY=${config.audienceApiKey}

# ============================================
# AI模型配置
# ============================================
AI_PROVIDER=${config.aiProvider}

# OpenAI配置
OPENAI_API_KEY=${config.aiProvider === 'openai' ? config.aiApiKey : ''}
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic Claude配置
ANTHROPIC_API_KEY=${config.aiProvider === 'anthropic' ? config.aiApiKey : ''}
ANTHROPIC_MODEL=claude-3-opus-20240229

# Kimi (Moonshot)配置
MOONSHOT_API_KEY=${config.aiProvider === 'moonshot' ? config.aiApiKey : ''}
MOONSHOT_MODEL=moonshot-v1-128k
MOONSHOT_BASE_URL=https://api.moonshot.cn/v1

# 智谱 AI (ChatGLM)配置
ZHIPU_API_KEY=${config.aiProvider === 'zhipu' ? config.aiApiKey : ''}
ZHIPU_MODEL=glm-4
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# MiniMax配置
MINIMAX_API_KEY=${config.aiProvider === 'minimax' ? config.aiApiKey : ''}
MINIMAX_MODEL=MiniMax-Text-01
MINIMAX_BASE_URL=https://api.minimax.chat/v1

# 量化派 OpenCode配置
OPENCODE_API_KEY=${config.aiProvider === 'opencode' ? config.aiApiKey : ''}
OPENCODE_MODEL=quantgroup/xingtan
OPENCODE_BASE_URL=http://10.4.16.154:5029/v1
OPENCODE_PROVIDER_ID=quantgroup
# 百度文心配置
BAIDU_API_KEY=${config.aiProvider === 'baidu' ? config.aiApiKey : ''}
BAIDU_SECRET_KEY=

# 阿里通义配置
ALIBABA_API_KEY=${config.aiProvider === 'alibaba' ? config.aiApiKey : ''}
ALIBABA_MODEL=qwen-max

# 本地Ollama配置
OLLAMA_BASE_URL=${config.ollamaUrl}
OLLAMA_MODEL=${config.ollamaModel}

# ============================================
# 其他配置
# ============================================
CORS_ORIGIN=http://localhost:5173
`;
  
  const envPath = path.join(ROOT_DIR, 'packages/backend/.env');
  await fs.writeFile(envPath, envContent);
  
  console.log(chalk.green('\n✅ 项目初始化完成！'));
  console.log(chalk.blue('\n下一步:'));
  console.log(`  1. cd ${ROOT_DIR}`);
  console.log('  2. strategy-cli doctor    # 检查环境');
  console.log('  3. strategy-cli dev       # 启动开发环境');
  console.log('');
  
  // 如果是本地模型，给出提示
  if (config.aiProvider === 'ollama') {
    console.log(chalk.yellow('💡 使用本地模型，请确保 Ollama 已安装并运行：'));
    console.log('   ollama run ' + config.ollamaModel);
    console.log('');
  }
}

module.exports = { registerInitCommand };
