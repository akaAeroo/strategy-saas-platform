# 部署清单

本文件记录了所有需要提交到 Git 仓库的文件。

## 核心文件

### 配置
- `.gitignore` - Git 忽略配置
- `docker-compose.yml` - Docker 部署配置
- `LICENSE` - MIT 许可证
- `README.md` - 项目说明
- `QUICKSTART.md` - 快速开始指南
- `CONTRIBUTING.md` - 贡献指南
- `DEPLOY.md` - 本文件

### 脚本
- `scripts/install.sh` - 一键安装脚本
- `scripts/setup-git.sh` - Git 初始化脚本

### AI诊断质量保障 (Skill)
- `ai-diagnosis-harness/SKILL.md`
- `ai-diagnosis-harness/assets/diagnosis_schema.json`
- `ai-diagnosis-harness/references/validation_rules.md`
- `ai-diagnosis-harness/references/quality_metrics.md`
- `ai-diagnosis-harness/references/example_diagnoses.json`
- `ai-diagnosis-harness/scripts/validate_diagnosis.py`
- `ai-diagnosis-harness/scripts/benchmark_prompt.py`
- `ai-diagnosis-harness/scripts/evaluate_quality.py`
- `ai-diagnosis-harness/scripts/generate_test_cases.py`

### 后端
- `packages/backend/package.json`
- `packages/backend/.env.example`
- `packages/backend/Dockerfile`
- `packages/backend/src/index.js`
- `packages/backend/src/config/index.js`
- `packages/backend/src/routes/segments.js`
- `packages/backend/src/routes/dashboard.js`
- `packages/backend/src/services/audienceApiService.js`
- `packages/backend/src/services/aiService.js`
- `packages/backend/src/services/diagnosisService.js`

### 前端
- `packages/frontend/package.json`
- `packages/frontend/index.html`
- `packages/frontend/vite.config.js`
- `packages/frontend/Dockerfile`
- `packages/frontend/src/main.jsx`
- `packages/frontend/src/App.jsx`
- `packages/frontend/src/index.css`
- `packages/frontend/src/services/api.js`
- `packages/frontend/src/pages/Dashboard.jsx`
- `packages/frontend/src/pages/Segments.jsx`
- `packages/frontend/src/pages/SegmentDetail.jsx`

### CLI
- `packages/cli/package.json`
- `packages/cli/bin/strategy-cli.js`
- `packages/cli/src/commands/harness.js`
- `packages/cli/src/commands/init.js`
- `packages/cli/src/commands/dev.js`
- `packages/cli/src/commands/doctor.js`

## 部署步骤

### 1. 本地验证

```bash
# 检查所有文件是否存在
ls -la ai-diagnosis-harness/
ls -la packages/backend/src/
ls -la packages/frontend/src/
ls -la packages/cli/src/

# 验证后端可以启动
cd packages/backend
cp .env.example .env
npm install
npm start

# 验证前端可以启动
cd packages/frontend
npm install
npm run dev
```

### 2. 提交到 Git

```bash
# 方式1: 使用脚本
./scripts/setup-git.sh

# 方式2: 手动
git init
git add .
git commit -m "初始提交: 智能策略平台 MVP"
git remote add origin <your-repo-url>
git push -u origin main
```

### 3. 验证安装

```bash
# 克隆到新目录测试
cd /tmp
git clone <your-repo-url>
cd strategy-saas-platform

# 运行安装脚本
./scripts/install.sh

# 初始化配置
strategy-cli init test-project

# 启动
strategy-cli dev
```

### 4. 发布 Release (可选)

```bash
# 打标签
git tag -a v1.0.0 -m "版本 1.0.0 - MVP"
git push origin v1.0.0

# 在 GitHub/GitLab 创建 Release
```

## 文件大小

```bash
# 查看项目大小
du -sh .
du -sh packages/*
du -sh ai-diagnosis-harness/
```

## 注意事项

1. **不要提交**:
   - `node_modules/` 目录
   - `.env` 文件（包含敏感信息）
   - `dist/` 或 `build/` 目录
   - 日志文件 (`*.log`)

2. **必须提交**:
   - `.env.example`（配置模板）
   - 所有源代码文件
   - 文档文件

3. **安装前准备**:
   - 确保 Node.js >= 16
   - 确保 Python 3 >= 3.8（可选）
   - 配置好 Git 用户信息

