import React from 'react';
import { Target, Users, Gift, Calendar, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';
import './StrategyCard.css';

// 安全渲染值的辅助函数
const SafeRender = ({ value }) => {
  if (value === null || value === undefined) return null;
  
  if (typeof value === 'string' || typeof value === 'number') {
    return <span>{value}</span>;
  }
  
  if (typeof value === 'boolean') {
    return <span>{value ? '是' : '否'}</span>;
  }
  
  if (Array.isArray(value)) {
    return (
      <ul className="safe-list">
        {value.map((item, i) => (
          <li key={i}><SafeRender value={item} /></li>
        ))}
      </ul>
    );
  }
  
  if (typeof value === 'object') {
    // 对象类型，遍历渲染
    return (
      <div className="safe-object">
        {Object.entries(value).map(([key, val]) => (
          <div key={key} className="safe-object-item">
            <span className="safe-object-key">{key}:</span>
            <span className="safe-object-value"><SafeRender value={val} /></span>
          </div>
        ))}
      </div>
    );
  }
  
  return <span>{String(value)}</span>;
};

const StrategyCard = ({ strategy }) => {
  if (!strategy) return null;

  const data = strategy.data || strategy;

  // 统一字段名（支持中英文）
  const getValue = (...keys) => {
    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null) return data[key];
    }
    return null;
  };

  const strategyName = getValue('策略名称', 'strategy_name', 'name', '策略名称');
  const targetSegment = getValue('目标人群', 'target_segment', 'targetSegment', 'target', '人群');
  const touchPlan = getValue('触达方案', 'touch_plan', 'touchPlan', 'channel', '触达渠道');
  const offer = getValue('权益设计', 'offer', '权益', '优惠');
  const expectedConversion = getValue('预期转化', 'expected_conversion', 'expectedConversion', '预估转化率', 'conversion');
  const coreGoal = getValue('核心目标', 'core_goal', 'coreGoal', 'goal', '目标');
  const executionPlan = getValue('执行方案', 'execution_plan', 'executionPlan', '执行步骤', 'steps');

  // 获取所有其他字段用于显示
  const otherFields = Object.entries(data).filter(([key]) => {
    const knownKeys = [
      '策略名称', 'strategy_name', 'name',
      '目标人群', 'target_segment', 'targetSegment', 'target', '人群',
      '触达方案', 'touch_plan', 'touchPlan', 'channel', '触达渠道',
      '权益设计', 'offer', '权益', '优惠',
      '预期转化', 'expected_conversion', 'expectedConversion', '预估转化率', 'conversion',
      '核心目标', 'core_goal', 'coreGoal', 'goal', '目标',
      '执行方案', 'execution_plan', 'executionPlan', '执行步骤', 'steps',
      'type', 'raw'
    ];
    return !knownKeys.includes(key);
  });

  return (
    <div className="strategy-card">
      <div className="strategy-header">
        <div className="strategy-icon">
          <Target size={24} />
        </div>
        <div className="strategy-title-section">
          <h3>{strategyName || '运营策略'}</h3>
          {coreGoal && <p className="strategy-goal"><SafeRender value={coreGoal} /></p>}
        </div>
      </div>

      <div className="strategy-body">
        {/* 目标人群 */}
        {targetSegment && (
          <div className="strategy-section">
            <div className="section-label">
              <Users size={16} />
              <span>目标人群</span>
            </div>
            <div className="section-content">
              <SafeRender value={targetSegment} />
            </div>
          </div>
        )}

        {/* 触达方案 */}
        {touchPlan && (
          <div className="strategy-section">
            <div className="section-label">
              <ArrowRight size={16} />
              <span>触达方案</span>
            </div>
            <div className="section-content">
              <SafeRender value={touchPlan} />
            </div>
          </div>
        )}

        {/* 权益设计 */}
        {offer && (
          <div className="strategy-section">
            <div className="section-label">
              <Gift size={16} />
              <span>权益设计</span>
            </div>
            <div className="section-content">
              <SafeRender value={offer} />
            </div>
          </div>
        )}

        {/* 预期效果 */}
        {expectedConversion && (
          <div className="strategy-section">
            <div className="section-label">
              <TrendingUp size={16} />
              <span>预期效果</span>
            </div>
            <div className="section-content">
              {typeof expectedConversion === 'number' ? (
                <div className="conversion-badge">
                  预估转化率 {(expectedConversion * 100).toFixed(1)}%
                </div>
              ) : (
                <SafeRender value={expectedConversion} />
              )}
            </div>
          </div>
        )}

        {/* 执行步骤 */}
        {executionPlan && (
          <div className="strategy-section">
            <div className="section-label">
              <CheckCircle size={16} />
              <span>执行步骤</span>
            </div>
            <div className="section-content">
              <SafeRender value={executionPlan} />
            </div>
          </div>
        )}

        {/* 其他字段 */}
        {otherFields.map(([key, value]) => (
          <div key={key} className="strategy-section">
            <div className="section-label">
              <span>{key}</span>
            </div>
            <div className="section-content">
              <SafeRender value={value} />
            </div>
          </div>
        ))}
      </div>

      <div className="strategy-footer">
        <button className="apply-btn">
          应用此策略
        </button>
        <button className="save-btn">
          保存草稿
        </button>
      </div>
    </div>
  );
};

export default StrategyCard;
