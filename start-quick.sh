#!/bin/bash

# 快速启动 - 使用预览模式（不需要 vite 实时编译）

echo "🚀 快速启动智能策略平台..."

# 启动后端
echo "🔧 启动后端服务..."
cd packages/backend
npm start &
BACKEND_PID=$!
cd ../..

# 等待后端启动
sleep 2

# 使用 preview 模式启动前端（更快）
echo "🎨 启动前端服务 (预览模式)..."
cd packages/frontend
npm run preview &
FRONTEND_PID=$!
cd ../..

echo ""
echo "✅ 服务已启动!"
echo ""
echo "📱 前端地址: http://localhost:4173 (预览模式)"
echo "🔌 后端地址: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
