#!/bin/bash

echo "🚀 开始上传到 GitHub..."
echo ""

cd /Users/mac/strategy-saas-platform

echo "📦 步骤 1: 添加所有文件..."
git add .

echo ""
echo "💾 步骤 2: 提交文件..."
git commit -m "🎉 初始提交: 智能策略平台 MVP

- 人群管理页可视化
- AI智能诊断（支持OpenAI/Claude/文心/通义）
- CLI一键启动工具
- AI诊断质量保障Harness"

echo ""
echo "🔗 步骤 3: 添加远程仓库..."
git remote add origin https://github.com/akaAeroo/strategy-saas-platform.git

echo ""
echo "🌿 步骤 4: 切换到 main 分支..."
git branch -M main

echo ""
echo "⬆️  步骤 5: 推送到 GitHub..."
git push -u origin main

echo ""
echo "✅ 上传完成！"
echo ""
echo "访问地址: https://github.com/akaAeroo/strategy-saas-platform"
