/**
 * Dev 命令 - 一键启动开发环境
 */

const { spawn } = require('child_process');
const path = require('path');
const chalk = require('chalk');

const ROOT_DIR = path.resolve(__dirname, '../../../..');
const BACKEND_DIR = path.join(ROOT_DIR, 'packages/backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'packages/frontend');

/**
 * 启动服务
 */
function startService(name, command, cwd, env = {}) {
  console.log(chalk.blue(`\n🚀 启动 ${name}...`));
  
  const [cmd, ...args] = command.split(' ');
  const proc = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'pipe'
  });
  
  // 输出前缀
  const prefix = chalk.cyan(`[${name}]`);
  
  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${prefix} ${line}`);
      }
    });
  });
  
  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${prefix} ${chalk.yellow(line)}`);
      }
    });
  });
  
  proc.on('close', (code) => {
    if (code !== 0) {
      console.log(chalk.red(`${prefix} 进程退出，代码: ${code}`));
    }
  });
  
  return proc;
}

/**
 * Dev 命令实现
 */
async function registerDevCommand(options) {
  console.log(chalk.blue('\n🛠️  启动智能策略平台开发环境...\n'));
  
  const processes = [];
  
  try {
    // 启动后端
    if (!options.frontendOnly) {
      // 检查依赖
      console.log(chalk.blue('📦 检查后端依赖...'));
      const backend = startService(
        'Backend',
        'npm run dev',
        BACKEND_DIR,
        { NODE_ENV: 'development' }
      );
      processes.push(backend);
      
      // 等待后端启动
      console.log(chalk.blue('⏳ 等待后端服务启动...'));
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // 启动前端
    if (!options.backendOnly) {
      console.log(chalk.blue('📦 检查前端依赖...'));
      const frontend = startService(
        'Frontend',
        'npm run dev',
        FRONTEND_DIR
      );
      processes.push(frontend);
    }
    
    // 打印访问信息
    console.log(chalk.green('\n✅ 服务启动成功！\n'));
    console.log(chalk.blue('访问地址:'));
    if (!options.frontendOnly) {
      console.log(`  🌐 后端API: ${chalk.cyan('http://localhost:3001')}`);
    }
    if (!options.backendOnly) {
      console.log(`  🖥️  前端界面: ${chalk.cyan('http://localhost:5173')}`);
    }
    
    console.log(chalk.gray('\n按 Ctrl+C 停止所有服务\n'));
    
    // 优雅退出
    const shutdown = () => {
      console.log(chalk.yellow('\n\n🛑 正在停止服务...'));
      processes.forEach(proc => {
        proc.kill('SIGTERM');
      });
      setTimeout(() => {
        processes.forEach(proc => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        });
        process.exit(0);
      }, 2000);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    console.error(chalk.red('启动失败:'), error.message);
    processes.forEach(proc => proc.kill());
    process.exit(1);
  }
}

module.exports = { registerDevCommand };
