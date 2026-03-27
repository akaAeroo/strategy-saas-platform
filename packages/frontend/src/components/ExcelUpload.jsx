import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import './ExcelUpload.css';

const ExcelUpload = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState(null);
  const [error, setError] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = async (file) => {
    const ext = file.name.slice(((file.name.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('只支持 .xlsx, .xls, .csv 文件');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadData(response);
      onUploadSuccess?.(response);
    } catch (err) {
      setError(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const clearUpload = () => {
    setUploadData(null);
    setError(null);
  };

  return (
    <div className="excel-upload">
      {!uploadData ? (
        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInput}
            className="file-input"
            id="excel-input"
          />
          <label htmlFor="excel-input" className="upload-label">
            {uploading ? (
              <>
                <Loader2 className="spin" size={48} />
                <p>正在解析...</p>
              </>
            ) : (
              <>
                <Upload size={48} />
                <p className="upload-title">拖拽 Excel 文件到此处</p>
                <p className="upload-subtitle">或点击选择文件</p>
                <span className="upload-hint">支持 .xlsx, .xls, .csv 格式</span>
              </>
            )}
          </label>
        </div>
      ) : (
        <div className="upload-result">
          <div className="result-header">
            <div className="result-icon">
              <FileSpreadsheet size={24} />
            </div>
            <div className="result-info">
              <h4>上传成功</h4>
              <p>共 {uploadData.totalRows.toLocaleString()} 行数据</p>
            </div>
            <button className="clear-btn" onClick={clearUpload}>
              <X size={18} />
            </button>
          </div>

          <div className="preview-section">
            <h5>数据预览（前10行）</h5>
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    {uploadData.headers.map((header, i) => (
                      <th key={i}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uploadData.preview.map((row, i) => (
                    <tr key={i}>
                      {uploadData.headers.map((header, j) => (
                        <td key={j}>{row[uploadData.columnMapping[header]] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mapping-section">
            <h5>列映射识别</h5>
            <div className="mapping-list">
              {Object.entries(uploadData.columnMapping).map(([original, mapped]) => (
                <div key={original} className="mapping-item">
                  <span className="original">{original}</span>
                  <span className="arrow">→</span>
                  <span className={`mapped ${mapped !== original ? 'recognized' : ''}`}>
                    {mapped}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-section">
            <h5>数据统计</h5>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">总用户数</span>
                <span className="value">{uploadData.summary.totalUsers.toLocaleString()}</span>
              </div>
              {uploadData.summary.statistics.valueLevelDistribution && (
                <div className="summary-item">
                  <span className="label">价值等级分布</span>
                  <span className="value">
                    {Object.entries(uploadData.summary.statistics.valueLevelDistribution)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ExcelUpload;
