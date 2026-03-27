import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Sparkles, 
  RefreshCw,
  AlertCircle,
  Lightbulb,
  Target,
  TrendingUp,
  Users,
  Activity,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { segmentsApi } from '../services/api'
import './SegmentDetail.css'

const SegmentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [segment, setSegment] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [diagnosis, setDiagnosis] = useState(null)
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [diagnosing, setDiagnosing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [segmentData, metricsData] = await Promise.all([
        segmentsApi.getDetail(id),
        segmentsApi.getMetrics(id)
      ])
      
      setSegment(segmentData)
      setMetrics(metricsData)
      
      try {
        const diagnosisData = await segmentsApi.getDiagnosis(id)
        setDiagnosis(diagnosisData)
      } catch {
        // 无诊断结果
      }
      
      try {
        const trendData = await segmentsApi.getTrend(id, 30)
        setTrend(trendData || [])
      } catch {
        setTrend([])
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDiagnose = async () => {
    try {
      setDiagnosing(true)
      const result = await segmentsApi.diagnose(id)
      setDiagnosis(result)
    } catch (error) {
      console.error('诊断失败:', error)
    } finally {
      setDiagnosing(false)
    }
  }

  const getHealthColor = (score) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#3b82f6'
    if (score >= 40) return '#f59e0b'
    return '#ef4444'
  }

  const getHealthLevel = (level) => {
    const map = { excellent: '优秀', good: '良好', warning: '需关注', critical: '严重' }
    return map[level] || level
  }

  const getSeverityIcon = (severity) => {
    const colors = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' }
    return colors[severity] || '#6b7280'
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="segment-detail-page animate-fade-in">
      {/* 返回按钮 */}
      <button className="back-btn" onClick={() => navigate('/segments')}>
        <ArrowLeft size={18} />
        返回人群列表
      </button>

      {/* 页面头部 */}
      <div className="detail-header">
        <div className="detail-title-section">
          <div className="detail-badge">P{segment?.level}</div>
          <h1 className="detail-title">{segment?.name}</h1>
        </div>
        <button 
          className={`diagnose-action-btn ${diagnosing ? 'loading' : ''}`}
          onClick={handleDiagnose}
          disabled={diagnosing}
        >
          {diagnosing ? <RefreshCw className="spin" size={18} /> : <Sparkles size={18} />}
          {diagnosis ? '重新诊断' : 'AI 诊断'}
        </button>
      </div>

      {/* 描述 */}
      <p className="detail-description">{segment?.description}</p>

      {/* 指标卡片 */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-icon blue">
            <Users size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">用户规模</span>
            <span className="metric-value">{metrics?.scale?.toLocaleString()}</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon green">
            <TrendingUp size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">转化率</span>
            <span className="metric-value">{(metrics?.conversion_rate * 100).toFixed(2)}%</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon orange">
            <Activity size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">7日流失率</span>
            <span className="metric-value">{(metrics?.churn_rate_7d * 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <div className="detail-content-grid">
        {/* 左侧：AI 诊断 */}
        <div className="detail-main">
          {!diagnosis ? (
            <div className="empty-diagnosis">
              <div className="empty-icon">
                <Sparkles size={48} />
              </div>
              <h3>尚未进行 AI 诊断</h3>
              <p>点击右上角「AI 诊断」按钮，使用大模型分析该人群的健康状况</p>
            </div>
          ) : (
            <>
              {/* 健康度评分 */}
              <div className="health-score-card">
                <div className="health-score-circle" style={{ '--health-color': getHealthColor(diagnosis.health_score) }}>
                  <svg viewBox="0 0 100 100">
                    <circle className="track" cx="50" cy="50" r="45" />
                    <circle 
                      className="progress" 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      style={{ 
                        strokeDasharray: `${diagnosis.health_score * 2.83} 283`,
                        stroke: getHealthColor(diagnosis.health_score)
                      }}
                    />
                  </svg>
                  <div className="score-content">
                    <span className="score-number">{diagnosis.health_score}</span>
                    <span className="score-unit">分</span>
                  </div>
                </div>
                <div className="health-info">
                  <span className="health-level" style={{ color: getHealthColor(diagnosis.health_score) }}>
                    {getHealthLevel(diagnosis.health_level)}
                  </span>
                  <p className="health-summary">{diagnosis.summary}</p>
                </div>
              </div>

              {/* 问题列表 */}
              {diagnosis.problems?.length > 0 && (
                <div className="section-card">
                  <div className="section-header">
                    <AlertCircle size={18} />
                    <h3>发现问题 ({diagnosis.problems.length})</h3>
                  </div>
                  <div className="problems-list">
                    {diagnosis.problems.map((problem) => (
                      <div key={problem.id} className="problem-item">
                        <div 
                          className="problem-severity" 
                          style={{ background: getSeverityIcon(problem.severity) }}
                        />
                        <div className="problem-content">
                          <h4>{problem.title}</h4>
                          <p>{problem.description}</p>
                          {problem.change_percent && (
                            <span className="problem-change">
                              变化: {problem.change_percent > 0 ? '+' : ''}{problem.change_percent}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 机会洞察 */}
              {diagnosis.opportunities?.length > 0 && (
                <div className="section-card">
                  <div className="section-header">
                    <Lightbulb size={18} />
                    <h3>机会洞察 ({diagnosis.opportunities.length})</h3>
                  </div>
                  <div className="opportunities-list">
                    {diagnosis.opportunities.map((opportunity) => (
                      <div key={opportunity.id} className="opportunity-item">
                        <Target size={16} />
                        <div className="opportunity-content">
                          <h4>{opportunity.title}</h4>
                          <p>{opportunity.description}</p>
                          {opportunity.potential_users && (
                            <span className="opportunity-potential">
                              潜在用户: {opportunity.potential_users.toLocaleString()} 人
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 策略建议 */}
              {diagnosis.suggestions?.length > 0 && (
                <div className="section-card">
                  <div className="section-header">
                    <CheckCircle2 size={18} />
                    <h3>策略建议</h3>
                  </div>
                  <div className="suggestions-list">
                    {diagnosis.suggestions.map((suggestion, index) => (
                      <div key={suggestion.id} className="suggestion-item">
                        <span className="suggestion-priority">P{suggestion.priority}</span>
                        <div className="suggestion-content">
                          <p>{suggestion.action}</p>
                          {suggestion.expected_outcome && (
                            <span className="suggestion-outcome">
                              预期: {suggestion.expected_outcome}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 诊断信息 */}
              <div className="diagnosis-meta">
                <div className="meta-item">
                  <Clock size={14} />
                  <span>诊断时间: {new Date(diagnosis.generated_at).toLocaleString()}</span>
                </div>
                <div className="meta-item">
                  <span>AI 模型: {diagnosis.ai_provider} / {diagnosis.ai_model}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 右侧：趋势图表 */}
        <div className="detail-sidebar">
          <div className="chart-card">
            <div className="chart-header">
              <h3>人群规模趋势</h3>
              <span className="chart-period">近 30 天</span>
            </div>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="scaleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2eaadc" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2eaadc" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => value.slice(5)}
                    stroke="var(--text-tertiary)"
                    fontSize={11}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value/10000).toFixed(0)}万`}
                    stroke="var(--text-tertiary)"
                    fontSize={11}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [value.toLocaleString(), '人群规模']}
                  />
                  <Area
                    type="monotone"
                    dataKey="scale"
                    stroke="#2eaadc"
                    fill="url(#scaleGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">暂无数据</div>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>活跃用户趋势</h3>
              <span className="chart-period">近 30 天</span>
            </div>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(value) => value.slice(5)}
                    stroke="var(--text-tertiary)"
                    fontSize={11}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value/10000).toFixed(0)}万`}
                    stroke="var(--text-tertiary)"
                    fontSize={11}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [value.toLocaleString(), '活跃用户']}
                  />
                  <Line
                    type="monotone"
                    dataKey="active_users"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">暂无数据</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SegmentDetail
