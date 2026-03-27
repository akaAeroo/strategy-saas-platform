import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Sparkles, 
  RefreshCw, 
  ChevronRight, 
  Trophy, 
  Users, 
  User,
  Activity,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react'
import { segmentsApi } from '../services/api'
import './Segments.css'

const Segments = () => {
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)
  const [diagnosing, setDiagnosing] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchSegments()
  }, [])

  const fetchSegments = async () => {
    try {
      setLoading(true)
      const list = await segmentsApi.getList()
      
      const segmentsWithDiagnosis = await Promise.all(
        list.map(async (segment) => {
          try {
            const diagnosis = await segmentsApi.getDiagnosis(segment.id)
            return { ...segment, diagnosis, hasDiagnosis: true }
          } catch {
            return { ...segment, hasDiagnosis: false }
          }
        })
      )
      
      setSegments(segmentsWithDiagnosis)
    } catch (error) {
      console.error('获取人群列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDiagnose = async (segment, e) => {
    e.stopPropagation()
    try {
      setDiagnosing({ ...diagnosing, [segment.id]: true })
      const result = await segmentsApi.diagnose(segment.id)
      
      setSegments(segments.map(s => 
        s.id === segment.id 
          ? { ...s, diagnosis: result, hasDiagnosis: true }
          : s
      ))
    } catch (error) {
      console.error('诊断失败:', error)
    } finally {
      setDiagnosing({ ...diagnosing, [segment.id]: false })
    }
  }

  const getLevelIcon = (level) => {
    const icons = {
      1: <Trophy size={18} />,
      2: <Users size={18} />,
      3: <User size={18} />
    }
    return icons[level] || <User size={18} />
  }

  const getLevelColor = (level) => {
    const colors = {
      1: 'gold',
      2: 'silver',
      3: 'bronze'
    }
    return colors[level] || 'default'
  }

  const getHealthStatus = (score) => {
    if (score === undefined || score === null) return { label: '未诊断', class: 'pending' }
    if (score >= 80) return { label: '优秀', class: 'excellent' }
    if (score >= 60) return { label: '良好', class: 'good' }
    if (score >= 40) return { label: '需关注', class: 'warning' }
    return { label: '严重', class: 'critical' }
  }

  const getProblemSummary = (diagnosis) => {
    if (!diagnosis) return null
    const problems = diagnosis.problems || []
    const critical = problems.filter(p => p.severity === 'critical').length
    const warning = problems.filter(p => p.severity === 'warning').length
    
    if (critical > 0) return { count: critical, type: 'critical', text: `${critical}个严重问题` }
    if (warning > 0) return { count: warning, type: 'warning', text: `${warning}个警告` }
    return { count: 0, type: 'good', text: '健康' }
  }

  const filteredSegments = segments.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="segments-page animate-fade-in">
      {/* 页面头部 */}
      <div className="page-header-section">
        <div className="page-title-wrap">
          <h1 className="page-title">人群管理</h1>
          <p className="page-subtitle">管理战略人群，AI 智能诊断用户健康度</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchSegments}>
          <RefreshCw size={16} />
          刷新
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="搜索人群..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost btn-sm">
          <Filter size={16} />
          筛选
        </button>
      </div>

      {/* 人群卡片网格 */}
      <div className="segments-grid">
        {filteredSegments.map((segment) => {
          const health = getHealthStatus(segment.diagnosis?.health_score)
          const problems = getProblemSummary(segment.diagnosis)
          
          return (
            <div 
              key={segment.id} 
              className="segment-card"
              onClick={() => navigate(`/segments/${segment.id}`)}
            >
              {/* 卡片头部 */}
              <div className="segment-card-header">
                <div className={`level-badge ${getLevelColor(segment.level)}`}>
                  {getLevelIcon(segment.level)}
                  <span>P{segment.level}</span>
                </div>
                <button 
                  className={`diagnose-btn ${segment.hasDiagnosis ? 'done' : ''}`}
                  onClick={(e) => handleDiagnose(segment, e)}
                  disabled={diagnosing[segment.id]}
                >
                  {diagnosing[segment.id] ? (
                    <RefreshCw size={14} className="spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {segment.hasDiagnosis ? '重新诊断' : 'AI诊断'}
                </button>
              </div>

              {/* 卡片内容 */}
              <div className="segment-card-body">
                <h3 className="segment-name">{segment.name}</h3>
                <p className="segment-desc">{segment.description}</p>
                
                <div className="segment-stats">
                  <div className="stat">
                    <Users size={14} />
                    <span>{(segment.scale / 10000).toFixed(1)}万人</span>
                  </div>
                </div>
              </div>

              {/* 健康度 */}
              <div className="segment-card-footer">
                {segment.hasDiagnosis ? (
                  <>
                    <div className="health-section">
                      <div className={`health-score ${health.class}`}>
                        <Activity size={16} />
                        <span className="score-value">{segment.diagnosis.health_score}</span>
                        <span className="score-label">分</span>
                      </div>
                      <span className={`health-tag ${health.class}`}>{health.label}</span>
                    </div>
                    {problems && (
                      <div className={`problem-badge ${problems.type}`}>
                        <AlertCircle size={12} />
                        {problems.text}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="health-pending">
                    <AlertCircle size={14} />
                    <span>点击 AI诊断 分析人群健康度</span>
                  </div>
                )}
              </div>

              {/* 悬停提示 */}
              <div className="card-arrow">
                <ChevronRight size={18} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 空状态 */}
      {filteredSegments.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <Search size={48} />
          </div>
          <h3>未找到人群</h3>
          <p>尝试修改搜索关键词</p>
        </div>
      )}
    </div>
  )
}

export default Segments
