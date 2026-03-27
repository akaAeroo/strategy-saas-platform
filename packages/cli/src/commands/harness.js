/**
 * CLI Harness 命令
 * 集成 ai-diagnosis-harness Skill 的质量保障能力
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

// Harness Skill 路径 (相对于 CLI 包的位置)
const HARNESS_DIR = path.resolve(__dirname, '../../../../ai-diagnosis-harness');
const SCRIPTS_DIR = path.join(HARNESS_DIR, 'scripts');

/**
 * 执行 Python 脚本
 */
function runPython(script, args = []) {
  const scriptPath = path.join(SCRIPTS_DIR, script);
  
  if (!fs.existsSync(scriptPath)) {
    console.error(chalk.red(`错误: Harness 脚本不存在: ${scriptPath}`));
    console.log(chalk.yellow('提示: 请确保 ai-diagnosis-harness Skill 已正确安装'));
    process.exit(1);
  }
  
  const cmd = `python3 "${scriptPath}" ${args.join(' ')}`;
  
  try {
    execSync(cmd, { 
      encoding: 'utf-8',
      stdio: 'inherit'
    });
  } catch (error) {
    if (error.status === 1) {
      // 验证失败，不是脚本错误
      process.exit(1);
    }
    throw error;
  }
}

/**
 * 注册 Harness 命令
 */
function registerHarnessCommands(program) {
  const harness = program
    .command('harness')
    .description('AI诊断质量保障工具集');
  
  // validate - 验证诊断结果
  harness
    .command('validate')
    .description('验证AI诊断结果的质量')
    .option('-i, --input <file>', '诊断结果JSON文件')
    .option('-s, --schema <file>', '自定义Schema文件')
    .option('-o, --output <file>', '输出报告路径')
    .option('--stdin', '从标准输入读取')
    .action(async (options) => {
      console.log(chalk.blue('🔍 验证诊断结果...\n'));
      
      const args = [];
      if (options.stdin) {
        args.push('--stdin');
      } else if (options.input) {
        args.push('--input', `"${options.input}"`);
      } else {
        console.error(chalk.red('错误: 请指定 --input 或 --stdin'));
        process.exit(1);
      }
      
      if (options.schema) args.push('--schema', `"${options.schema}"`);
      if (options.output) args.push('--output', `"${options.output}"`);
      
      runPython('validate_diagnosis.py', args);
    });
  
  // benchmark - Prompt 基准测试
  harness
    .command('benchmark')
    .description('对 Prompt 进行基准测试')
    .requiredOption('-p, --prompt <file>', 'Prompt文件路径')
    .option('-c, --cases <file>', '测试用例JSON文件')
    .option('-n, --count <number>', '测试用例数量', '10')
    .option('-o, --output <file>', '输出报告路径')
    .action(async (options) => {
      console.log(chalk.blue('🧪 运行 Prompt 基准测试...\n'));
      
      const args = [
        '--prompt', `"${options.prompt}"`,
        '--count', options.count
      ];
      
      if (options.cases) args.push('--cases', `"${options.cases}"`);
      if (options.output) args.push('--output', `"${options.output}"`);
      
      runPython('benchmark_prompt.py', args);
    });
  
  // evaluate - 质量评估
  harness
    .command('evaluate')
    .description('生成质量评估报告')
    .option('-d, --days <number>', '分析天数', '7')
    .option('-s, --segment-id <id>', '指定人群ID')
    .option('-i, --input-dir <dir>', '诊断数据目录')
    .option('-o, --output <file>', '输出报告路径')
    .action(async (options) => {
      console.log(chalk.blue('📊 生成质量评估报告...\n'));
      
      const args = ['--days', options.days];
      
      if (options.segmentId) args.push('--segment-id', options.segmentId);
      if (options.inputDir) args.push('--input-dir', `"${options.inputDir}"`);
      if (options.output) args.push('--output', `"${options.output}"`);
      
      runPython('evaluate_quality.py', args);
    });
  
  // generate-tests - 生成测试用例
  harness
    .command('generate-tests')
    .description('生成测试用例')
    .option('-n, --count <number>', '生成数量', '20')
    .option('-s, --scenario <type>', '场景类型 (critical/warning/good/edge/all)')
    .option('-e, --include-edge', '包含边界测试')
    .requiredOption('-o, --output <file>', '输出文件路径')
    .action(async (options) => {
      console.log(chalk.blue('🎲 生成测试用例...\n'));
      
      const args = [
        '--count', options.count,
        '--output', `"${options.output}"`,
        '--pretty'
      ];
      
      if (options.scenario) args.push('--scenario', options.scenario);
      if (options.includeEdge) args.push('--include-edge');
      
      runPython('generate_test_cases.py', args);
    });
  
  // ci-check - CI/CD 检查
  harness
    .command('ci-check')
    .description('CI/CD 质量检查')
    .option('-d, --days <number>', '检查天数', '1')
    .option('--strict', '严格模式，任何警告也视为失败')
    .action(async (options) => {
      console.log(chalk.blue('🔬 运行 CI 质量检查...\n'));
      
      // 1. 评估质量
      const tmpFile = `/tmp/harness_ci_report_${Date.now()}.json`;
      
      try {
        runPython('evaluate_quality.py', [
          '--days', options.days,
          '--output', tmpFile,
          '--format', 'json'
        ]);
        
        // 2. 读取报告
        const report = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'));
        
        // 3. 判断结果
        const grade = report.overall_grade;
        const metrics = report.metrics;
        
        console.log('\n' + chalk.blue('质量检查结果:'));
        console.log(`综合评级: ${getGradeColor(grade)(grade)}`);
        console.log(`结构合规率: ${metrics.structure_compliance.value}%`);
        console.log(`数值合理率: ${metrics.value_rationality.value}%`);
        console.log(`逻辑一致率: ${metrics.logical_consistency.value}%`);
        
        // 4. 判定通过/失败
        let passed = true;
        
        if (grade === 'D') {
          passed = false;
          console.log(chalk.red('\n❌ 质量等级不合格 (D)'));
        }
        
        if (options.strict) {
          if (metrics.structure_compliance.status !== 'pass') {
            passed = false;
            console.log(chalk.red('\n❌ 严格模式: 结构合规率未达标'));
          }
          if (metrics.logical_consistency.status !== 'pass') {
            passed = false;
            console.log(chalk.red('\n❌ 严格模式: 逻辑一致率未达标'));
          }
        }
        
        if (passed) {
          console.log(chalk.green('\n✅ CI 检查通过'));
          process.exit(0);
        } else {
          console.log(chalk.red('\n❌ CI 检查失败'));
          process.exit(1);
        }
        
      } finally {
        // 清理临时文件
        if (fs.existsSync(tmpFile)) {
          fs.unlinkSync(tmpFile);
        }
      }
    });
  
  // doctor - 环境检查
  harness
    .command('doctor')
    .description('检查 Harness 环境')
    .action(() => {
      console.log(chalk.blue('🔧 检查 Harness 环境...\n'));
      
      const checks = [
        { name: 'Harness 目录', path: HARNESS_DIR },
        { name: '脚本目录', path: SCRIPTS_DIR },
        { name: 'Schema 文件', path: path.join(HARNESS_DIR, 'assets/diagnosis_schema.json') },
        { name: '验证脚本', path: path.join(SCRIPTS_DIR, 'validate_diagnosis.py') },
        { name: '基准测试脚本', path: path.join(SCRIPTS_DIR, 'benchmark_prompt.py') },
        { name: '评估脚本', path: path.join(SCRIPTS_DIR, 'evaluate_quality.py') },
      ];
      
      let allPassed = true;
      
      for (const check of checks) {
        const exists = fs.existsSync(check.path);
        const icon = exists ? chalk.green('✓') : chalk.red('✗');
        const status = exists ? chalk.green('存在') : chalk.red('缺失');
        console.log(`${icon} ${check.name}: ${status}`);
        
        if (!exists) allPassed = false;
      }
      
      // 检查 Python
      try {
        execSync('python3 --version', { encoding: 'utf-8' });
        console.log(chalk.green('✓ Python3: 已安装'));
      } catch {
        console.log(chalk.red('✗ Python3: 未安装'));
        allPassed = false;
      }
      
      console.log('');
      if (allPassed) {
        console.log(chalk.green('✅ Harness 环境正常'));
      } else {
        console.log(chalk.red('❌ Harness 环境异常，请检查安装'));
        process.exit(1);
      }
    });
  
  return harness;
}

function getGradeColor(grade) {
  const colors = {
    'A': chalk.green,
    'B': chalk.blue,
    'C': chalk.yellow,
    'D': chalk.red
  };
  return colors[grade] || chalk.white;
}

module.exports = { registerHarnessCommands };
