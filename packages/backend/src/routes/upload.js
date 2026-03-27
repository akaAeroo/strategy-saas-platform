/**
 * Excel 上传路由
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const excelService = require('../services/excelService');

const router = express.Router();

// 配置 multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('只支持 .xlsx, .xls, .csv 文件'));
    }
  }
});

// 存储上传数据（内存中，生产环境应使用 Redis）
const uploadCache = new Map();

/**
 * POST /api/upload/excel
 * 上传并解析 Excel
 */
router.post('/excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: -1, message: '请选择文件' });
    }

    console.log('收到上传文件:', req.file.originalname, req.file.size, 'bytes');

    // 保存文件
    const { uploadId, filePath } = await excelService.saveFile(
      req.file.buffer,
      req.file.originalname
    );

    // 解析 Excel
    const parseResult = await excelService.parseExcel(filePath);
    parseResult.filePath = filePath;

    // 缓存数据
    uploadCache.set(uploadId, parseResult);

    // 生成摘要
    const summary = excelService.generateDataSummary(parseResult);

    res.json({
      code: 0,
      data: {
        uploadId,
        filename: req.file.originalname,
        totalRows: parseResult.totalRows,
        headers: parseResult.headers,
        columnMapping: parseResult.columnMapping,
        preview: parseResult.preview,
        summary
      }
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({
      code: -1,
      message: '上传失败: ' + error.message
    });
  }
});

/**
 * GET /api/upload/preview/:uploadId
 * 获取预览数据
 */
router.get('/preview/:uploadId', (req, res) => {
  const { uploadId } = req.params;
  const data = uploadCache.get(uploadId);

  if (!data) {
    return res.status(404).json({ code: -1, message: '文件已过期或不存在' });
  }

  res.json({
    code: 0,
    data: {
      totalRows: data.totalRows,
      headers: data.headers,
      columnMapping: data.columnMapping,
      preview: data.preview
    }
  });
});

/**
 * POST /api/upload/confirm/:uploadId
 * 确认导入，创建人群
 */
router.post('/confirm/:uploadId', async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { name, description } = req.body;

    const data = uploadCache.get(uploadId);
    if (!data) {
      return res.status(404).json({ code: -1, message: '文件已过期或不存在' });
    }

    // 创建人群（简化版，实际应保存到数据库）
    const segment = {
      id: `seg_excel_${Date.now()}`,
      name: name || 'Excel导入人群',
      description: description || `从 Excel 导入的 ${data.totalRows} 人`,
      source: 'excel',
      uploadId,
      totalRows: data.totalRows,
      createdAt: new Date().toISOString()
    };

    // 清理缓存和文件
    uploadCache.delete(uploadId);
    await excelService.cleanup(data.filePath);

    res.json({
      code: 0,
      data: segment
    });
  } catch (error) {
    console.error('确认导入失败:', error);
    res.status(500).json({
      code: -1,
      message: '导入失败: ' + error.message
    });
  }
});

/**
 * GET /api/upload/summary/:uploadId
 * 获取数据摘要（用于 AI 分析）
 */
router.get('/summary/:uploadId', (req, res) => {
  const { uploadId } = req.params;
  const data = uploadCache.get(uploadId);

  if (!data) {
    return res.status(404).json({ code: -1, message: '文件已过期或不存在' });
  }

  const summary = excelService.generateDataSummary(data);

  res.json({
    code: 0,
    data: summary
  });
});

module.exports = router;
