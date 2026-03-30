#!/bin/bash

# 智能策略平台 - 开发环境启动脚本

echo "🚀 启动智能策略平台..."

# 检查并安装后端依赖
if [ ! -d "packages/backend/node_modules" ]; then
    echo "📦 安装后端依赖..."
    cd packages/backend && npm install && cd ../..
fi

# 检查并安装前端依赖
if [ ! -d "packages/frontend/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd packages/frontend && npm install && cd ../..
fi

# 启动后端
echo "🔧 启动后端服务 (端口: 3001)..."
cd packages/backend
npm start &
BACKEND_PID=$!
cd ../..

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端服务 (端口: 5173)..."
cd packages/frontend
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "✅ 服务已启动!"
echo ""
echo "📱 前端地址: http://localhost:5173"
echo "🔌 后端地址: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
