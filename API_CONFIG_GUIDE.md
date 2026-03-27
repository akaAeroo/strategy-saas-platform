# 🔑 AI 模型 API Key 配置指南

支持的大模型平台及配置方式

---

## 🚀 快速配置

### 方式1: 使用 CLI 初始化（推荐）

```bash
strategy-cli init my-project
```

按提示选择模型并输入 API Key

### 方式2: 手动编辑配置文件

编辑文件：`packages/backend/.env`

```bash
# 选择 AI 提供商
AI_PROVIDER=openai  # 或 moonshot, zhipu, baidu, alibaba, ollama

# 填入对应 API Key
OPENAI_API_KEY=sk-your-key-here
```

---

## 📋 各平台 API Key 获取方式

### 1. OpenAI (GPT-4)

**官网**: https://platform.openai.com

**获取步骤**:
1. 注册/登录 OpenAI 账号
2. 点击右上角个人头像 → "View API keys"
3. 点击 "Create new secret key"
4. 复制生成的 key（以 `sk-` 开头）

**配置**:
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4-turbo-preview
```

---

### 2. Kimi / Kimi Code (Moonshot)

**官网**: https://platform.moonshot.cn

**获取步骤**:
1. 使用手机号注册登录
2. 进入控制台 → "API Key 管理"
3. 点击 "创建 API Key"
4. 复制生成的 key（以 `sk-` 开头）

**配置**:
```bash
AI_PROVIDER=moonshot
MOONSHOT_API_KEY=sk-your-moonshot-key
MOONSHOT_MODEL=moonshot-v1-128k  # 或 moonshot-v1-32k, moonshot-v1-8k
```

**注意**: Kimi 和 Kimi Code 使用同一个 API 平台

---

### 3. 智谱 AI (ChatGLM)

**官网**: https://open.bigmodel.cn

**获取步骤**:
1. 注册智谱 AI 账号
2. 进入 "API Keys" 页面
3. 添加新的 API Key
4. 复制 key

**配置**:
```bash
AI_PROVIDER=zhipu
ZHIPU_API_KEY=your.zhipu.api.key
ZHIPU_MODEL=glm-4  # 或 glm-4-plus, glm-4-flash
```

---

### 4. 百度文心一言

**官网**: https://ai.baidu.com

**获取步骤**:
1. 登录百度智能云
2. 进入 "千帆大模型平台"
3. 创建应用，获取 API Key 和 Secret Key

**配置**:
```bash
AI_PROVIDER=baidu
BAIDU_API_KEY=your-api-key
BAIDU_SECRET_KEY=your-secret-key
```

---

### 5. 阿里通义千问

**官网**: https://dashscope.aliyun.com

**获取步骤**:
1. 登录阿里云
2. 进入 DashScope 控制台
3. 创建 API Key

**配置**:
```bash
AI_PROVIDER=alibaba
ALIBABA_API_KEY=sk-your-alibaba-key
ALIBABA_MODEL=qwen-max  # 或 qwen-plus, qwen-turbo
```

---

### 6. 本地 Ollama（无需 API Key）

**官网**: https://ollama.com

**安装步骤**:
1. 下载安装 Ollama: https://ollama.com/download
2. 拉取模型:
   ```bash
   ollama pull llama2
   # 或 ollama pull qwen
   # 或 ollama pull chatglm
   ```
3. 运行模型:
   ```bash
   ollama run llama2
   ```

**配置**:
```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

**适用场景**:
- 无网络环境
- 数据隐私要求高
- 免费无限使用

---

## 📝 完整配置示例

### 示例1: 使用 OpenAI

```bash
# packages/backend/.env

AI_PROVIDER=openai
OPENAI_API_KEY=sk-abc123xyz789
OPENAI_MODEL=gpt-4-turbo-preview
```

### 示例2: 使用 Kimi

```bash
# packages/backend/.env

AI_PROVIDER=moonshot
MOONSHOT_API_KEY=sk-your-moonshot-key
MOONSHOT_MODEL=moonshot-v1-128k
```

### 示例3: 使用本地 Ollama

```bash
# packages/backend/.env

AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen
```

---

## 🔒 安全注意事项

1. **不要提交 API Key 到 Git**
   - `.env` 文件已加入 `.gitignore`
   - 只提交 `.env.example` 作为模板

2. **保护你的 API Key**
   - 不要将 key 硬编码在代码中
   - 不要分享包含 key 的截图
   - 定期轮换 API Key

3. **使用环境变量（生产环境）**
   ```bash
   # Linux/Mac
   export OPENAI_API_KEY=sk-your-key
   
   # Windows PowerShell
   $env:OPENAI_API_KEY="sk-your-key"
   ```

---

## 💰 费用参考

| 平台 | 免费额度 | 付费价格 |
|------|---------|---------|
| OpenAI | $5 新用户额度 | $0.01-0.03/1K tokens |
| Kimi | 15元新用户额度 | ¥0.006-0.012/1K tokens |
| 智谱 AI | 100万 tokens | ¥0.005-0.1/1K tokens |
| 文心一言 | 有免费额度 | 按量计费 |
| 通义千问 | 100万 tokens | 按量计费 |
| Ollama | 完全免费 | 本地运行 |

---

## 🐛 常见问题

### Q: API Key 无效？

A: 检查以下几点：
1. Key 是否复制完整
2. 是否有多余空格
3. 账号是否有余额
4. 是否开启了 API 访问权限

### Q: 如何切换模型？

A: 修改 `.env` 中的 `AI_PROVIDER` 和对应配置，然后重启服务：
```bash
strategy-cli dev
```

### Q: 可以同时配置多个模型吗？

A: 目前只能使用一个主模型。可以在 `.env` 中配置多个，但只使用 `AI_PROVIDER` 指定的那个。

### Q: 国内访问 OpenAI 超时？

A: 建议改用国内模型：
- Kimi (Moonshot)
- 智谱 AI
- 文心一言
- 通义千问

或使用代理：
```bash
OPENAI_BASE_URL=https://your-proxy-url.com/v1
```

---

## 📞 获取帮助

- Kimi 支持: https://platform.moonshot.cn/docs
- 智谱 AI: https://open.bigmodel.cn/dev/howuse/glm-4
- Ollama: https://github.com/ollama/ollama
