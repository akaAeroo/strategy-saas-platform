# 智能策略平台 - 公司大模型配置指南

## 快速开始

### 方式一：使用配置脚本（推荐）

#### macOS / Linux
```bash
# 运行配置工具
./bin/strategy-config.sh
```

#### Windows
```powershell
# 运行配置工具
.\bin\strategy-config.ps1
```

### 方式二：手动配置

1. 复制环境文件模板
```bash
cd packages/backend
cp .env.example .env
```

2. 编辑 `.env` 文件
```bash
# 公司 Minimax 配置
AI_PROVIDER=minimax
MINIMAX_API_KEY=你的_API_Key
MINIMAX_BASE_URL=http://10.4.16.154:5029/v1
MINIMAX_MODEL=MiniMax-M2.5
```

3. 获取 API Key
   - 访问公司网关: https://gateway.xrtan.cn:5029
   - 使用钉钉扫码登录
   - 进入「可用模型」页面
   - 复制你的 API Key

## 配置脚本功能

```
智能策略平台 - 公司大模型配置工具

1) 配置公司 Minimax API Key
2) 查看当前配置
3) 测试 AI 连接
4) 切换 AI 提供商
5) 退出
```

### 功能说明

| 选项 | 功能 | 说明 |
|-----|------|------|
| 1 | 配置 Minimax API Key | 引导式配置公司内网模型 |
| 2 | 查看当前配置 | 显示已保存的配置信息 |
| 3 | 测试 AI 连接 | 验证 API Key 是否可用 |
| 4 | 切换提供商 | 在 Minimax/OpenCode/OpenAI 间切换 |

## 配置示例

### 公司内网 Minimax（推荐）
```env
AI_PROVIDER=minimax
MINIMAX_API_KEY=sk-your-key-here
MINIMAX_BASE_URL=http://10.4.16.154:5029/v1
MINIMAX_MODEL=MiniMax-M2.5
```

### 量化派 OpenCode
```env
AI_PROVIDER=opencode
OPENCODE_API_KEY=your-key
OPENCODE_BASE_URL=http://10.4.16.154:5029/v1
OPENCODE_MODEL=quantgroup/xingtan
```

### OpenAI
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
```

## 验证配置

配置完成后，重启后端服务：

```bash
cd packages/backend
npm start
```

测试 AI 连接：
```bash
curl -X POST http://localhost:3001/api/agents/data_analysis/execute-stream \
  -H "Content-Type: application/json" \
  -d '{"question":"你好"}'
```

## 故障排查

### 连接超时
- 检查 VPN 是否连接
- 确认网关地址可访问：`ping 10.4.16.154`

### 401 未授权
- API Key 可能过期，重新从网关获取
- 检查 API Key 是否复制完整

### 模型无响应
- 查看后端日志：`tail -f /tmp/backend.log`
- 检查配置是否生效：`cat packages/backend/.env`

## 安全提示

⚠️ **切勿将 .env 文件提交到 Git**
```bash
# 已添加到 .gitignore
.env
.env.local
```

⚠️ **API Key 保密**
- 不要分享给他人
- 定期轮换密钥
- 发现泄露立即重置
