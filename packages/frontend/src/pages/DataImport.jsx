import React, { useState } from 'react';
import { Upload, FileSpreadsheet, MessageSquare, ArrowRight, Check, Sparkles } from 'lucide-react';
import ExcelUpload from '../components/ExcelUpload';
import AIChat from '../components/AIChat';
import StrategyCard from '../components/StrategyCard';
import './DataImport.css';

const DataImport = () => {
  const [step, setStep] = useState(1); // 1: 上传, 2: 对话, 3: 策略
  const [uploadData, setUploadData] = useState(null);
  const [strategy, setStrategy] = useState(null);

  const handleUploadSuccess = (data) => {
    setUploadData(data);
    // 自动进入下一步
    setTimeout(() => setStep(2), 1000);
  };

  const handleStrategyGenerated = (newStrategy) => {
    setStrategy(newStrategy);
    setStep(3);
  };

  const steps = [
    { id: 1, title: '上传数据', icon: Upload },
    { id: 2, title: 'AI 分析', icon: MessageSquare },
    { id: 3, title: '生成策略', icon: Sparkles }
  ];

  return (
    <div className="data-import-page">
      {/* 步骤指示器 */}
      <div className="steps-indicator">
        {steps.map((s, index) => {
          const Icon = s.icon;
          return (
            <React.Fragment key={s.id}>
              <div className={`step-item ${step >= s.id ? 'active' : ''} ${step > s.id ? 'completed' : ''}`}>
                <div className="step-icon">
                  {step > s.id ? <Check size={18} /> : <Icon size={18} />}
                </div>
                <span className="step-title">{s.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`step-connector ${step > s.id ? 'active' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 步骤内容 */}
      <div className="steps-content">
        {/* 步骤 1: 上传 */}
        {step === 1 && (
          <div className="step-panel animate-fade-in">
            <div className="step-header">
              <h2>上传用户数据</h2>
              <p>支持 Excel 或 CSV 格式，系统将自动识别列并分析</p>
            </div>
            <ExcelUpload onUploadSuccess={handleUploadSuccess} />
            {uploadData && (
              <div className="step-actions">
                <button className="btn btn-primary" onClick={() => setStep(2)}>
                  下一步：AI 分析 <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 步骤 2: AI 对话 */}
        {step === 2 && uploadData && (
          <div className="step-panel animate-fade-in">
            <div className="step-layout">
              <div className="data-summary">
                <h3>数据概览</h3>
                <div className="summary-cards">
                  <div className="summary-card">
                    <span className="value">{uploadData.totalRows.toLocaleString()}</span>
                    <span className="label">总用户数</span>
                  </div>
                  {uploadData.summary?.statistics?.valueLevelDistribution && (
                    <div className="summary-card">
                      <span className="value">
                        {Object.keys(uploadData.summary.statistics.valueLevelDistribution).length}
                      </span>
                      <span className="label">价值等级</span>
                    </div>
                  )}
                </div>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>
                  重新上传
                </button>
              </div>
              <div className="chat-section">
                <AIChat 
                  uploadData={uploadData} 
                  onStrategyGenerated={handleStrategyGenerated}
                />
              </div>
            </div>
          </div>
        )}

        {/* 步骤 3: 策略展示 */}
        {step === 3 && (
          <div className="step-panel animate-fade-in">
            <div className="step-header">
              <h2>策略方案</h2>
              <p>AI 根据数据分析生成的运营策略</p>
            </div>
            <div className="strategy-result">
              {strategy ? (
                <>
                  <StrategyCard strategy={strategy} />
                  <div className="strategy-actions">
                    <button className="btn btn-secondary" onClick={() => setStep(2)}>
                      返回调整
                    </button>
                    <button className="btn btn-primary">
                      应用策略
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-strategy">
                  <p>暂未生成策略，请返回上一步生成</p>
                  <button className="btn btn-primary" onClick={() => setStep(2)}>
                    去生成策略
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataImport;
