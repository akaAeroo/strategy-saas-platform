# 贡献指南

感谢您对智能策略平台的关注！

## 开发流程

```bash
# 1. Fork 仓库

# 2. 克隆您的 Fork
git clone https://github.com/YOUR_USERNAME/strategy-saas-platform.git

# 3. 创建分支
git checkout -b feature/your-feature

# 4. 开发并提交
git add .
git commit -m "feat: 添加新功能"

# 5. 推送
git push origin feature/your-feature

# 6. 创建 Pull Request
```

## 代码规范

- 使用 ESLint 检查代码
- 提交信息遵循 Conventional Commits
- 新功能需要包含测试

## 提交信息格式

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

## 分支管理

- `main`: 稳定版本
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复
