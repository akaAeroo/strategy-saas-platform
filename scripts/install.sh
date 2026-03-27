#!/bin/bash

# 智能策略平台 - 快速安装脚本
# Usage: curl -fsSL <url>/install.sh | bash

set -e

REPO_URL="https://github.com/yourcompany/strategy-saas-platform"
INSTALL_DIR="$HOME/.strategy-platform"
CLI_DIR="$INSTALL_DIR/packages/cli"

echo "🚀 安装智能策略平台..."

# 检查依赖
check_dependency() {
  if ! command -v $1 &> /dev/null; then
    echo "❌ 缺少依赖: $1"
    return 1
  fi
  echo "✓ $1 已安装"
}

echo ""
echo "📋 检查依赖..."
check_dependency git
check_dependency node || exit 1
check_dependency npm || exit 1
check_dependency python3 || exit 1

# 克隆仓库
echo ""
echo "📥 下载代码..."
if [ -d "$INSTALL_DIR" ]; then
  echo "目录已存在，更新代码..."
  cd "$INSTALL_DIR" && git pull
else
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

# 安装 CLI
echo ""
echo "🔧 安装 CLI..."
cd "$CLI_DIR"
npm install

# 链接到全局
npm link

# 检查安装
echo ""
echo "✅ 检查安装..."
strategy-cli harness doctor

echo ""
echo "🎉 安装完成！"
echo ""
echo "快速开始:"
echo "  strategy-cli init my-project"
echo "  strategy-cli harness validate --input diagnosis.json"
echo ""
