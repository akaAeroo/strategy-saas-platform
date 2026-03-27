#!/usr/bin/env node

/**
 * Strategy Platform CLI
 * 智能策略平台命令行工具
 */

const { Command } = require('commander');
const chalk = require('chalk');

// 导入子命令
const { registerHarnessCommands } = require('../src/commands/harness');
const { registerInitCommand } = require('../src/commands/init');
const { registerDevCommand } = require('../src/commands/dev');
const { registerDoctorCommand } = require('../src/commands/doctor');

const program = new Command();

program
  .name('strategy-cli')
  .description('智能策略平台 CLI 工具')
  .version('1.0.0');

// 初始化项目
program
  .command('init <name>')
  .description('初始化策略平台项目')
  .option('--role <role>', '角色: frontend/backend/operator/qa')
  .action(async (name, options) => {
    await registerInitCommand(name, options);
  });

// 环境检查
program
  .command('doctor')
  .description('检查环境配置和依赖')
  .action(async () => {
    await registerDoctorCommand();
  });

// 启动开发环境
program
  .command('dev')
  .description('一键启动开发环境（前后端）')
  .option('--frontend-only', '仅启动前端')
  .option('--backend-only', '仅启动后端')
  .action(async (options) => {
    await registerDevCommand(options);
  });

// 注册 Harness 命令
registerHarnessCommands(program);

// 帮助信息增强
program.on('--help', () => {
  console.log('');
  console.log(chalk.blue('快速开始:'));
  console.log('  $ strategy-cli init my-project');
  console.log('  $ strategy-cli doctor');
  console.log('  $ strategy-cli dev');
  console.log('');
  console.log(chalk.blue('AI诊断质量保障:'));
  console.log('  $ strategy-cli harness doctor         # 检查Harness环境');
  console.log('  $ strategy-cli harness validate -i diagnosis.json');
  console.log('  $ strategy-cli harness benchmark -p prompt.txt');
  console.log('  $ strategy-cli harness evaluate --days 7');
  console.log('');
});

// 解析参数
program.parse();

// 如果没有参数，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
