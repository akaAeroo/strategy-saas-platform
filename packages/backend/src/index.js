/**
 * 智能策略平台 - 后端服务
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { config, validateConfig } = require('./config');
const segmentsRouter = require('./routes/segments');
const dashboardRouter = require('./routes/dashboard');
const uploadRouter = require('./routes/upload');
const chatRouter = require('./routes/chat');

const app = express();

// 中间件
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日志
if (config.isDev) {
  app.use(morgan('dev'));
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API 路由
app.use('/api/segments', segmentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/chat', chatRouter);

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    code: -1,
    message: '服务器内部错误',
    error: config.isDev ? err.message : undefined
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    code: -1,
    message: '接口不存在'
  });
});

// 启动服务
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║     智能策略平台 - 后端服务                      ║
╠════════════════════════════════════════════════╣
║  服务地址: http://localhost:${PORT}              ║
║  环境: ${config.isDev ? '开发' : '生产'}                          ║
╚════════════════════════════════════════════════╝
  `);
  
  validateConfig();
});

module.exports = app;
