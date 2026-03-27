# Git 上传指南

## 你已经完成了第一步 ✓
```bash
git init  ✅ 已完成
```

## 继续执行以下命令：

### 1. 添加所有文件
```bash
git add .
```

### 2. 提交
```bash
git commit -m "初始提交: 智能策略平台 MVP"
```

### 3. 添加远程仓库（替换为你的实际地址）
```bash
git remote add origin https://github.com/YOUR_USERNAME/strategy-saas-platform.git
```

### 4. 推送
```bash
git branch -M main
git push -u origin main
```

---

## 完整命令（复制粘贴执行）

**替换 `YOUR_USERNAME` 为你的 GitHub/GitLab 用户名**

```bash
cd /Users/mac/strategy-saas-platform
git add .
git commit -m "🎉 初始提交: 智能策略平台 MVP"
git remote add origin https://github.com/YOUR_USERNAME/strategy-saas-platform.git
git branch -M main
git push -u origin main
```

---

## 如果遇到权限问题

### 方式1: 使用 HTTPS + 密码
```bash
git remote add origin https://github.com/YOUR_USERNAME/strategy-saas-platform.git
# 推送时会提示输入用户名和密码（密码用 Personal Access Token）
```

### 方式2: 使用 SSH（推荐）
```bash
git remote add origin git@github.com:YOUR_USERNAME/strategy-saas-platform.git
# 需要提前配置 SSH 密钥
```

---

## 验证上传成功

```bash
# 查看远程仓库地址
git remote -v

# 查看提交历史
git log --oneline
```

然后去浏览器访问你的仓库地址查看文件是否上传成功。
