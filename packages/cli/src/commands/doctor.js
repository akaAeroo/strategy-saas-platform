/**
 * Doctor 命令 - 环境检查
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');

const ROOT_DIR = path.resolve(__dirname, '../../../..');

async function checkCommand(command, args = ['--version']) {
  try {
    execSync(`${command} ${args.join(' ')}`, { stdio: 'pipe' });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function checkPort(port) {
  try {
    await axios.get(`http://localhost:${port}/health`, { timeout: 1000 });
    return { ok: true, running: true };
  } catch {
    return { ok: true, running: false };
  }
}

async function registerDoctorCommand() {
  console.log(chalk.blue('\n🔍 环境检查\n'));
  
  const checks = [];
  
  // 1. 检查 Node.js
  const nodeCheck = await checkCommand('node');
  checks.push({
    name: 'Node.js',
    status: nodeCheck.ok ? 'ok' : 'error',
    message: nodeCheck.ok ? '已安装' : '未安装'
  });
  
  // 2. 检查 npm
  const npmCheck = await checkCommand('npm');
  checks.push({
    name: 'npm',
    status: npmCheck.ok ? 'ok' : 'error',
    message: npmCheck.ok ? '已安装' : '未安装'
  });
  
  // 3. 检查 Python3
  const pythonCheck = await checkCommand('python3');
  checks.push({
    name: 'Python3',
    status: pythonCheck.ok ? 'ok' : 'warning',
    message: pythonCheck.ok ? '已安装' : '未安装 (Harness 功能不可用)'
  });
  
  // 4. 检查目录结构
  const backendExists = fs.existsSync(path.join(ROOT_DIR, 'packages/backend'));
  const frontendExists = fs.existsSync(path.join(ROOT_DIR, 'packages/frontend'));
  checks.push({
    name: '项目结构',
    status: backendExists && frontendExists ? 'ok' : 'error',
    message: backendExists && frontendExists ? '完整' : '缺失'
  });
  
  // 5. 检查后端依赖
  const backendNodeModules = fs.existsSync(path.join(ROOT_DIR, 'packages/backend/node_modules'));
  checks.push({
    name: '后端依赖',
    status: backendNodeModules ? 'ok' : 'warning',
    message: backendNodeModules ? '已安装' : '未安装 (运行 npm install)'
  });
  
  // 6. 检查前端依赖
  const frontendNodeModules = fs.existsSync(path.join(ROOT_DIR, 'packages/frontend/node_modules'));
  checks.push({
    name: '前端依赖',
    status: frontendNodeModules ? 'ok' : 'warning',
    message: frontendNodeModules ? '已安装' : '未安装 (运行 npm install)'
  });
  
  // 7. 检查后端配置文件
  const backendEnv = fs.existsSync(path.join(ROOT_DIR, 'packages/backend/.env'));
  const backendEnvExample = fs.existsSync(path.join(ROOT_DIR, 'packages/backend/.env.example'));
  checks.push({
    name: '后端配置',
    status: backendEnv ? 'ok' : 'warning',
    message: backendEnv ? '已配置' : '未配置 (复制 .env.example 到 .env)'
  });
  
  // 8. 检查端口占用
  const backendPort = await checkPort(3001);
  checks.push({
    name: '后端端口 (3001)',
    status: 'ok',
    message: backendPort.running ? '已被占用' : '可用'
  });
  
  const frontendPort = await checkPort(5173);
  checks.push({
    name: '前端端口 (5173)',
    status: 'ok',
    message: frontendPort.running ? '已被占用' : '可用'
  });
  
  // 打印结果
  let errorCount = 0;
  let warningCount = 0;
  
  checks.forEach(check => {
    const icon = check.status === 'ok' ? chalk.green('✓') : 
                 check.status === 'warning' ? chalk.yellow('⚠') : chalk.red('✗');
    const color = check.status === 'ok' ? chalk.green :
                  check.status === 'warning' ? chalk.yellow : chalk.red;
    console.log(`${icon} ${check.name}: ${color(check.message)}`);
    
    if (check.status === 'error') errorCount++;
    if (check.status === 'warning') warningCount++;
  });
  
  console.log('');
  
  if (errorCount > 0) {
    console.log(chalk.red(`❌ 发现 ${errorCount} 个错误，请先修复后再启动`));
    process.exit(1);
  } else if (warningCount > 0) {
    console.log(chalk.yellow(`⚠️  发现 ${warningCount} 个警告，部分功能可能不可用`));
  } else {
    console.log(chalk.green('✅ 环境检查通过！可以运行 strategy-cli dev 启动开发环境'));
  }
  
  console.log('');
}

module.exports = { registerDoctorCommand };
