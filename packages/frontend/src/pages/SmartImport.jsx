import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, MessageSquare, Sparkles, Check, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { aiAnalyzeApi } from '../services/api';
import AIAnalystChat from '../components/AIAnalystChat';
import StrategyCard from '../components/StrategyCard';
import './SmartImport.css';

// Storage keys for persistence
const STORAGE_KEY_SESSION = 'smart_import_session';
const STORAGE_KEY_FILE = 'smart_import_file';
const STORAGE_KEY_STEP = 'smart_import_step';
const STORAGE_KEY_STRATEGY = 'smart_import_strategy';

/**
 * 智能导入页面
 * 简化流程：上传文件 → AI 自动分析 → 生成策略
 */
const SmartImport = () => {
  const [step, setStep] = useState('upload'); // upload, analyzing, chat, strategy
  const [sessionId, setSessionId] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isRestored, setIsRestored] = useState(false);
  
  const fileInputRef = useRef(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (!isRestored) {
      const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
      const savedFile = localStorage.getItem(STORAGE_KEY_FILE);
      const savedStep = localStorage.getItem(STORAGE_KEY_STEP);
      const savedStrategy = localStorage.getItem(STORAGE_KEY_STRATEGY);

      if (savedSession && savedFile) {
        try {
          setSessionId(savedSession);
          setFileInfo(JSON.parse(savedFile));
          if (savedStrategy) {
            setStrategy(JSON.parse(savedStrategy));
          }
          if (savedStep && savedStep !== 'analyzing') {
            setStep(savedStep);
          }
        } catch (e) {
          console.error('Failed to restore session:', e);
          clearStorage();
        }
      }
      setIsRestored(true);
    }
  }, [isRestored]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (isRestored) {
      if (sessionId) {
        localStorage.setItem(STORAGE_KEY_SESSION, sessionId);
        localStorage.setItem(STORAGE_KEY_STEP, step);
        if (fileInfo) {
          localStorage.setItem(STORAGE_KEY_FILE, JSON.stringify(fileInfo));
        }
        if (strategy) {
          localStorage.setItem(STORAGE_KEY_STRATEGY, JSON.stringify(strategy));
        }
      } else {
        clearStorage();
      }
    }
  }, [sessionId, fileInfo, step, strategy, isRestored]);

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_FILE);
    localStorage.removeItem(STORAGE_KEY_STEP);
    localStorage.removeItem(STORAGE_KEY_STRATEGY);
    // Also clear chat messages
    if (sessionId) {
      localStorage.removeItem(`ai_chat_${sessionId}`);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await processFile(file);
  };

  // Handle drag and drop
  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Process file upload
  const processFile = async (file) => {
    const validTypes = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validTypes.includes(ext)) {
      setError('请上传 Excel 或 CSV 文件');
      return;
    }

    // Clear previous session
    clearStorage();
    setStrategy(null);

    setStep('analyzing');
    setError(null);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await aiAnalyzeApi.upload(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      setSessionId(result.sessionId);
      setFileInfo({
        filename: result.filename,
        totalRows: result.totalRows,
        sampledRows: result.sampledRows,
        headers: result.headers
      });

      setTimeout(() => {
        setStep('chat');
      }, 500);

    } catch (err) {
      setError(err.message || '上传失败，请重试');
      setStep('upload');
    }
  };

  // Handle strategy generation
  const handleStrategyGenerated = (newStrategy) => {
    setStrategy(newStrategy);
    setStep('strategy');
  };

  // Restart
  const handleRestart = () => {
    clearStorage();
    setStep('upload');
    setSessionId(null);
    setFileInfo(null);
    setStrategy(null);
    setError(null);
    setIsRestored(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render upload area
  const renderUploadArea = () => (
    <div className="smart-upload-section">
      <div className="upload-header">
        <h2>📊 智能数据导入</h2>
        <p>上传 Excel/CSV 文件，AI 将自动解析数据并进行深度分析</p>
      </div>

      <div 
        className="upload-dropzone"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="dropzone-content">
          <div className="dropzone-icon">
            <FileSpreadsheet size={48} />
          </div>
          <h3>点击或拖拽文件到此处</h3>
          <p>支持 .xlsx, .xls, .csv 格式</p>
          <span className="file-limit">文件大小限制：10MB</span>
        </div>
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <div className="upload-error">
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="upload-features">
        <div className="feature-item">
          <div className="feature-icon">🔍</div>
          <span>智能列识别</span>
        </div>
        <div className="feature-item">
          <div className="feature-icon">📈</div>
          <span>自动统计分析</span>
        </div>
        <div className="feature-item">
          <div className="feature-icon">💡</div>
          <span>AI 洞察建议</span>
        </div>
        <div className="feature-item">
          <div className="feature-icon">🎯</div>
          <span>策略生成</span>
        </div>
      </div>
    </div>
  );

  // Render analyzing state
  const renderAnalyzing = () => (
    <div className="analyzing-section">
      <div className="analyzing-animation">
        <div className="brain-icon">🧠</div>
        <div className="processing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <h3>AI 正在解析数据...</h3>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
      <p className="analyzing-hints">
        {uploadProgress < 30 && '正在上传文件...'}
        {uploadProgress >= 30 && uploadProgress < 60 && '正在解析数据结构...'}
        {uploadProgress >= 60 && uploadProgress < 90 && '正在加载 AI 分析引擎...'}
        {uploadProgress >= 90 && '即将完成...'}
      </p>
    </div>
  );

  // Render chat interface
  const renderChat = () => (
    <div className="chat-section">
      <div className="chat-layout">
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <h3>📁 文件信息</h3>
          </div>
          <div className="file-info-card">
            <div className="info-row">
              <span className="info-label">文件名</span>
              <span className="info-value" title={fileInfo?.filename}>
                {fileInfo?.filename}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">总记录</span>
              <span className="info-value">
                {fileInfo?.totalRows?.toLocaleString()} 条
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">分析样本</span>
              <span className="info-value">
                {fileInfo?.sampledRows?.toLocaleString()} 条
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">字段数</span>
              <span className="info-value">
                {fileInfo?.headers?.length} 个
              </span>
            </div>
          </div>
          
          <div className="sidebar-section">
            <h4>字段列表</h4>
            <div className="headers-list">
              {fileInfo?.headers?.map((header, i) => (
                <span key={i} className="header-tag">{header}</span>
              ))}
            </div>
          </div>

          <button className="restart-btn" onClick={handleRestart}>
            <RefreshCw size={14} />
            重新上传
          </button>
        </div>

        <div className="chat-main">
          {sessionId ? (
            <AIAnalystChat 
              sessionId={sessionId}
              fileInfo={fileInfo}
              onStrategyGenerated={handleStrategyGenerated}
            />
          ) : (
            <div className="no-session">
              <p>会话已过期，请重新上传文件</p>
              <button className="btn btn-primary" onClick={handleRestart}>
                重新上传
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render strategy result
  const renderStrategy = () => (
    <div className="strategy-section">
      <div className="strategy-header">
        <h2>🎯 运营策略方案</h2>
        <p>AI 基于数据分析生成的策略建议</p>
      </div>
      
      <div className="strategy-content">
        {strategy ? (
          <>
            <StrategyCard strategy={strategy} />
            <div className="strategy-actions">
              <button className="btn btn-secondary" onClick={() => setStep('chat')}>
                <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                返回调整
              </button>
              <button className="btn btn-primary" onClick={handleRestart}>
                <Sparkles size={16} />
                开始新的分析
              </button>
            </div>
          </>
        ) : (
          <div className="empty-strategy">
            <p>暂未生成策略</p>
            <button className="btn btn-primary" onClick={() => setStep('chat')}>
              返回对话生成策略
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Steps indicator
  const steps = [
    { key: 'upload', label: '上传文件', icon: Upload },
    { key: 'analyzing', label: 'AI 解析', icon: Loader2 },
    { key: 'chat', label: '对话分析', icon: MessageSquare },
    { key: 'strategy', label: '策略方案', icon: Sparkles }
  ];

  const getStepIndex = (s) => steps.findIndex(step => step.key === s);
  const currentStepIndex = getStepIndex(step);

  return (
    <div className="smart-import-page">
      {/* Steps indicator */}
      <div className="smart-steps">
        {steps.map((s, index) => {
          const Icon = s.icon;
          const isActive = index <= currentStepIndex;
          const isCompleted = index < currentStepIndex;
          
          return (
            <React.Fragment key={s.key}>
              <div className={`smart-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div className="step-circle">
                  {isCompleted ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <span className="step-label">{s.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`step-line ${isCompleted ? 'completed' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Content area */}
      <div className="smart-content">
        {step === 'upload' && renderUploadArea()}
        {step === 'analyzing' && renderAnalyzing()}
        {step === 'chat' && renderChat()}
        {step === 'strategy' && renderStrategy()}
      </div>
    </div>
  );
};

export default SmartImport;
