import React, { useEffect, useState } from 'react'
import { 
  Users, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  Clock
} from 'lucide-react'
import { dashboardApi } from '../services/api'
import './Dashboard.css'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const data = await dashboardApi.getStats()
      setStats(data)
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHealthColor = (score) => {
    if (score >= 80) return 'excellent'
    if (score >= 60) return 'good'
    if (score >= 40) return 'warning'
    return 'critical'
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
    <div className="dashboard-page animate-fade-in">
      {/* 页面标题 */}
      <div className="page-header">
        <h1 className="page-title">
          <Sparkles className="title-icon" />
          策略运营总览
        </h1>
        <p className="page-subtitle">
          实时监控人群健康度，AI 智能诊断助力精准运营
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">战略人群</span>
            <span className="stat-value">{stats?.segment_count || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">覆盖用户</span>
            <span className="stat-value">
              {stats?.total_users ? `${(stats.total_users / 10000).toFixed(1)}万` : '0'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">平均健康度</span>
            <span className={`stat-value health-${getHealthColor(stats?.diagnosis_stats?.avg_health_score || 0)}`}>
              {stats?.diagnosis_stats?.avg_health_score || 0}
              <span className="stat-unit">分</span>
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper orange">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">诊断次数</span>
            <span className="stat-value">{stats?.diagnosis_stats?.total || 0}</span>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="content-grid">
        {/* 左侧：人群列表 */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">战略人群</h2>
            <button className="card-action">
              查看全部 <ArrowUpRight size={16} />
            </button>
          </div>
          
          <div className="segment-list">
            {stats?.segments?.map((segment, index) => (
              <a 
                key={segment.id} 
                href={`/segments/${segment.id}`}
                className="segment-item"
              >
                <div className="segment-rank">{index + 1}</div>
                <div className="segment-info">
                  <h3 className="segment-name">{segment.name}</h3>
                  <span className="segment-meta">
                    P{segment.level} 优先级 · {(segment.scale / 10000).toFixed(1)}万人
                  </span>
                </div>
                <div className="segment-health">
                  {segment.health_score ? (
                    <span className={`health-badge ${getHealthColor(segment.health_score)}`}>
                      {segment.health_score}分
                    </span>
                  ) : (
                    <span className="health-badge pending">未诊断</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* 右侧：健康度分布 + 最近诊断 */}
        <div className="content-sidebar">
          {/* 健康度分布 */}
          <div className="content-card">
            <div className="card-header">
              <h2 className="card-title">健康度分布</h2>
            </div>
            
            <div className="health-distribution">
              <div className="health-item">
                <div className="health-indicator excellent" />
                <span className="health-label">优秀</span>
                <span className="health-count">{stats?.diagnosis_stats?.good || 0}</span>
              </div>
              <div className="health-item">
                <div className="health-indicator warning" />
                <span className="health-label">需关注</span>
                <span className="health-count">{stats?.diagnosis_stats?.warning || 0}</span>
              </div>
              <div className="health-item">
                <div className="health-indicator critical" />
                <span className="health-label">严重</span>
                <span className="health-count">{stats?.diagnosis_stats?.critical || 0}</span>
              </div>
            </div>
          </div>

          {/* 最近诊断 */}
          {stats?.recent_diagnoses && stats.recent_diagnoses.length > 0 && (
            <div className="content-card">
              <div className="card-header">
                <h2 className="card-title">最近诊断</h2>
              </div>
              
              <div className="recent-list">
                {stats.recent_diagnoses.map((diagnosis) => (
                  <div key={diagnosis.segment_id} className="recent-item">
                    <div className={`recent-dot ${getHealthColor(diagnosis.health_score)}`} />
                    <div className="recent-content">
                      <span className="recent-name">{diagnosis.segment_name}</span>
                      <span className="recent-summary">
                        {diagnosis.summary?.slice(0, 30)}...
                      </span>
                    </div>
                    <span className={`recent-score ${getHealthColor(diagnosis.health_score)}`}>
                      {diagnosis.health_score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 快速提示 */}
          <div className="content-card tips-card">
            <div className="card-header">
              <AlertCircle size={18} />
              <h2 className="card-title">快速提示</h2>
            </div>
            <ul className="tips-list">
              <li>点击「AI诊断」按钮分析人群健康度</li>
              <li>健康度低于 60 分需要重点关注</li>
              <li>系统支持多种 AI 模型切换</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
