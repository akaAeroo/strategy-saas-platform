import React from 'react';
import { Target, Users, Gift, Calendar, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';
import './StrategyCard.css';

const StrategyCard = ({ strategy }) => {
  if (!strategy) return null;

  const data = strategy.data || strategy;

  // 统一字段名（支持中英文）
  const getValue = (...keys) => {
    for (const key of keys) {
      if (data[key]) return data[key];
    }
    return null;
  };

  const strategyName = getValue('策略名称', 'strategy_name', 'name');
  const targetSegment = getValue('目标人群', 'target_segment', 'targetSegment', 'target');
  const touchPlan = getValue('触达方案', 'touch_plan', 'touchPlan', 'channel');
  const offer = getValue('权益设计', 'offer', '权益');
  const expectedConversion = getValue('预期转化', 'expected_conversion', 'expectedConversion', '预估转化率');
  const coreGoal = getValue('核心目标', 'core_goal', 'coreGoal', 'goal');
  const executionPlan = getValue('执行方案', 'execution_plan', 'executionPlan', '执行步骤');

  return (
    <div className="strategy-card">
      <div className="strategy-header">
        <div className="strategy-icon">
          <Target size={24} />
        </div>
        <div className="strategy-title-section">
          <h3>{strategyName || '运营策略'}</h3>
          {coreGoal && <p className="strategy-goal">{coreGoal}</p>}
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
              {typeof targetSegment === 'string' ? targetSegment : (
                <>
                  <p className="segment-name">{targetSegment.name || targetSegment.人群名称}</p>
                  {(targetSegment.size || targetSegment.人数) && (
                    <span className="segment-size">
                      {(targetSegment.size || targetSegment.人数).toLocaleString()} 人
                    </span>
                  )}
                </>
              )}
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
              {typeof touchPlan === 'string' ? touchPlan : (
                <div className="touch-details">
                  {(touchPlan.channel || touchPlan.渠道 || touchPlan.触达渠道) && (
                    <span className="touch-channel">
                      {touchPlan.channel || touchPlan.渠道 || touchPlan.触达渠道}
                    </span>
                  )}
                  {(touchPlan.message || touchPlan.文案 || touchPlan.消息内容) && (
                    <p className="touch-message">
                      "{touchPlan.message || touchPlan.文案 || touchPlan.消息内容}"
                    </p>
                  )}
                  {(touchPlan.time || touchPlan.时机 || touchPlan.发送时间) && (
                    <span className="touch-time">
                      <Calendar size={12} />
                      {touchPlan.time || touchPlan.时机 || touchPlan.发送时间}
                    </span>
                  )}
                </div>
              )}
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
              {typeof offer === 'string' ? offer : (
                <div className="offer-details">
                  <span className="offer-type">
                    {offer.type || offer.类型 || '优惠券'}
                  </span>
                  <span className="offer-value">
                    {offer.value || offer.价值 || offer.优惠力度}
                  </span>
                  {(offer.valid_days || offer.有效期 || offer.validDays) && (
                    <span className="offer-validity">
                      有效期 {(offer.valid_days || offer.有效期 || offer.validDays)} 天
                    </span>
                  )}
                </div>
              )}
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
              <div className="conversion-badge">
                预估转化率 {(typeof expectedConversion === 'number' 
                  ? (expectedConversion * 100).toFixed(1) 
                  : expectedConversion)}%
              </div>
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
              {Array.isArray(executionPlan) ? (
                <ol className="execution-steps">
                  {executionPlan.map((step, i) => (
                    <li key={i}>{typeof step === 'string' ? step : step.步骤 || step.step}</li>
                  ))}
                </ol>
              ) : (
                <p>{executionPlan}</p>
              )}
            </div>
          </div>
        )}
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
