# 快速开始指南

## 方式1: 命令行安装（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/yourcompany/strategy-saas-platform.git
cd strategy-saas-platform

# 2. 运行安装脚本
chmod +x scripts/install.sh
./scripts/install.sh

# 3. 初始化配置
strategy-cli init my-project

# 4. 启动开发环境
strategy-cli dev
```

## 方式2: 手动安装

```bash
# 1. 克隆仓库
git clone https://github.com/yourcompany/strategy-saas-platform.git
cd strategy-saas-platform

# 2. 安装 CLI
cd packages/cli
npm install
npm link
cd ../..

# 3. 配置环境
strategy-cli init my-project

# 4. 安装后端依赖
cd packages/backend
npm install
cd ../..

# 5. 安装前端依赖
cd packages/frontend
npm install
cd ../..

# 6. 启动
strategy-cli dev
```

## 方式3: Docker

```bash
# 1. 克隆仓库
git clone https://github.com/yourcompany/strategy-saas-platform.git
cd strategy-saas-platform

# 2. 启动
docker-compose up -d
```

## 访问

- 前端界面: http://localhost:5173
- 后端API: http://localhost:3001
- API文档: http://localhost:3001/api-docs

## 常见问题

### Q: 安装时报错 "command not found: strategy-cli"

A: 确保全局 npm bin 目录在 PATH 中：
```bash
export PATH="$PATH:$(npm bin -g)"
```

### Q: 后端启动失败

A: 检查 `.env` 文件是否存在：
```bash
cd packages/backend
cp .env.example .env
# 编辑 .env 填写你的 API 密钥
```

### Q: 如何切换 AI 模型？

A: 修改 `packages/backend/.env`：
```bash
# OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxx

# 或 Claude
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# 或百度文心
AI_PROVIDER=baidu
BAIDU_API_KEY=xxx
BAIDU_SECRET_KEY=xxx

# 或阿里通义
AI_PROVIDER=alibaba
ALIBABA_API_KEY=xxx
```

### Q: 没有公司数据 API 怎么办？

A: 系统会自动使用模拟数据，无需配置也可以体验完整功能。

### Q: 如何验证 AI 诊断质量？

A: 使用 Harness 工具：
```bash
# 检查环境
strategy-cli harness doctor

# 验证诊断结果
strategy-cli harness validate --input diagnosis.json

# 生成质量报告
strategy-cli harness evaluate --days 7
```

## 目录说明

```
strategy-saas-platform/
├── packages/
│   ├── backend/      # Node.js 后端 (端口 3001)
│   ├── frontend/     # React 前端 (端口 5173)
│   └── cli/          # 命令行工具
├── ai-diagnosis-harness/  # AI质量保障
└── scripts/          # 安装脚本
```

## 技术支持

- 文档: https://docs.yourcompany.com/strategy-platform
- Issues: https://github.com/yourcompany/strategy-saas-platform/issues
- 邮件: support@yourcompany.com
