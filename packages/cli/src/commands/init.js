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
        { name: '百度文心一言', value: 'baidu' },
        { name: '阿里通义千问', value: 'alibaba' }
      ],
      default: 'openai'
    },
    {
      type: 'password',
      name: 'aiApiKey',
      message: 'AI API密钥:',
      mask: '*'
    }
  ]);
  
  const config = {
    role: options.role || answers.role,
    audienceApiUrl: answers.audienceApiUrl,
    audienceApiKey: answers.audienceApiKey,
    aiProvider: answers.aiProvider,
    aiApiKey: answers.aiApiKey
  };
  
  // 生成后端 .env 文件
  const envContent = `# 智能策略平台配置
# 生成时间: ${new Date().toISOString()}

PORT=3001

# 公司数据API
AUDIENCE_API_URL=${config.audienceApiUrl}
AUDIENCE_API_KEY=${config.audienceApiKey}

# AI配置
AI_PROVIDER=${config.aiProvider}

# OpenAI配置 (如选择OpenAI)
OPENAI_API_KEY=${config.aiProvider === 'openai' ? config.aiApiKey : ''}
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic配置 (如选择Claude)
ANTHROPIC_API_KEY=${config.aiProvider === 'anthropic' ? config.aiApiKey : ''}
ANTHROPIC_MODEL=claude-3-opus-20240229

# 百度配置 (如选择文心)
BAIDU_API_KEY=${config.aiProvider === 'baidu' ? config.aiApiKey : ''}
BAIDU_SECRET_KEY=

# 阿里配置 (如选择通义)
ALIBABA_API_KEY=${config.aiProvider === 'alibaba' ? config.aiApiKey : ''}
ALIBABA_MODEL=qwen-max

# CORS配置
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
}

module.exports = { registerInitCommand };
