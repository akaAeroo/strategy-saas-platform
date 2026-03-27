#!/bin/bash

# Git 仓库初始化脚本
# Usage: ./scripts/setup-git.sh

set -e

echo "🔧 初始化 Git 仓库..."

# 检查是否已初始化
if [ -d ".git" ]; then
  echo "Git 仓库已存在"
else
  git init
  echo "✅ Git 仓库已创建"
fi

# 配置 Git（如果没有配置）
if [ -z "$(git config user.name)" ]; then
  echo ""
  read -p "请输入 Git 用户名: " git_name
  git config user.name "$git_name"
fi

if [ -z "$(git config user.email)" ]; then
  echo ""
  read -p "请输入 Git 邮箱: " git_email
  git config user.email "$git_email"
fi

# 添加远程仓库（如果提供了）
echo ""
read -p "请输入远程仓库地址 (直接回车跳过): " remote_url

if [ -n "$remote_url" ]; then
  # 检查是否已有远程仓库
  if git remote | grep -q "origin"; then
    git remote set-url origin "$remote_url"
    echo "✅ 远程仓库地址已更新"
  else
    git remote add origin "$remote_url"
    echo "✅ 远程仓库已添加"
  fi
fi

# 添加所有文件
echo ""
echo "📦 添加文件到 Git..."
git add .

# 检查是否有变更
if git diff --cached --quiet; then
  echo "没有需要提交的变更"
else
  # 提交
  echo ""
  read -p "请输入提交信息 [初始提交]: " commit_msg
  commit_msg=${commit_msg:-"初始提交"}
  
  git commit -m "$commit_msg"
  echo "✅ 文件已提交"
fi

# 推送到远程（如果有）
if git remote | grep -q "origin"; then
  echo ""
  read -p "是否推送到远程仓库? (y/n): " push_confirm
  
  if [ "$push_confirm" = "y" ] || [ "$push_confirm" = "Y" ]; then
    echo "🚀 推送到远程仓库..."
    git push -u origin main || git push -u origin master
    echo "✅ 推送完成"
  fi
fi

echo ""
echo "🎉 Git 仓库初始化完成！"
echo ""
echo "常用命令:"
echo "  git status          # 查看状态"
echo "  git add .           # 添加所有变更"
echo "  git commit -m 'msg' # 提交变更"
echo "  git push            # 推送到远程"
echo ""
