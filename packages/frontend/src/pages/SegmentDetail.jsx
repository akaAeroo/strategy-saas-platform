import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Spin,
  Alert,
  Statistic,
  Row,
  Col,
  Timeline,
  List,
  Progress,
  message,
  Divider
} from 'antd'
import {
  ArrowLeftOutlined,
  MedicineBoxOutlined,
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { segmentsApi } from '../services/api'

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
      
      // 并行获取数据
      const [segmentData, metricsData] = await Promise.all([
        segmentsApi.getDetail(id),
        segmentsApi.getMetrics(id)
      ])
      
      setSegment(segmentData)
      setMetrics(metricsData)
      
      // 获取诊断结果（可能不存在）
      try {
        const diagnosisData = await segmentsApi.getDiagnosis(id)
        setDiagnosis(diagnosisData)
      } catch {
        // 无诊断结果，忽略错误
      }
      
      // 获取趋势数据
      try {
        const trendData = await segmentsApi.getTrend(id, 30)
        setTrend(trendData || [])
      } catch {
        setTrend([])
      }
      
    } catch (error) {
      message.error('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDiagnose = async () => {
    try {
      setDiagnosing(true)
      message.loading({ content: 'AI正在分析人群数据...', duration: 0 })
      
      const result = await segmentsApi.diagnose(id)
      setDiagnosis(result)
      
      message.destroy()
      message.success('AI诊断完成！')
    } catch (error) {
      message.destroy()
      message.error('诊断失败: ' + error.message)
    } finally {
      setDiagnosing(false)
    }
  }

  const getHealthColor = (score) => {
    if (score >= 80) return '#52c41a'
    if (score >= 60) return '#faad14'
    return '#f5222d'
  }

  const getHealthLevelText = (level) => {
    const map = {
      excellent: '优秀',
      good: '良好',
      warning: '需关注',
      critical: '严重'
    }
    return map[level] || level
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <WarningOutlined style={{ color: '#f5222d' }} />
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />
    }
  }

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'red',
      warning: 'orange',
      info: 'blue'
    }
    return colors[severity] || 'default'
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>加载中...</p>
      </div>
    )
  }

  return (
    <div>
      {/* 顶部导航 */}
      <div style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/segments')}>
          返回列表
        </Button>
      </div>

      {/* 人群基本信息 */}
      <Card style={{ marginBottom: 24 }}>
        <Descriptions
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>{segment?.name}</span>
              <Tag color={segment?.level === 1 ? 'red' : segment?.level === 2 ? 'orange' : 'blue'}>
                P{segment?.level}
              </Tag>
            </div>
          }
          bordered
          column={4}
        >
          <Descriptions.Item label="人群ID">{segment?.id}</Descriptions.Item>
          <Descriptions.Item label="用户规模">
            {metrics?.scale?.toLocaleString()} 人
          </Descriptions.Item>
          <Descriptions.Item label="转化率">
            {(metrics?.conversion_rate * 100).toFixed(2)}%
          </Descriptions.Item>
          <Descriptions.Item label="7日流失率">
            {(metrics?.churn_rate_7d * 100).toFixed(2)}%
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={4}>
            {segment?.description || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={24}>
        {/* 左侧：AI诊断 */}
        <Col span={10}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MedicineBoxOutlined />
                <span>AI 诊断报告</span>
              </div>
            }
            extra={
              <Button
                type="primary"
                icon={<MedicineBoxOutlined />}
                loading={diagnosing}
                onClick={handleDiagnose}
              >
                {diagnosis ? '重新诊断' : '开始诊断'}
              </Button>
            }
          >
            {!diagnosis ? (
              <Alert
                message="尚未进行AI诊断"
                description="点击右上角的按钮，调用云端大模型分析该人群的健康状况。"
                type="info"
                showIcon
              />
            ) : (
              <div>
                {/* 健康度评分 */}
                <div style={{ textAlign: 'center', padding: '24px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 48, fontWeight: 'bold', color: getHealthColor(diagnosis.health_score) }}>
                    {diagnosis.health_score}
                  </div>
                  <div style={{ fontSize: 16, color: '#666', marginTop: 8 }}>
                    健康度评分 - {getHealthLevelText(diagnosis.health_level)}
                  </div>
                  <Progress
                    percent={diagnosis.health_score}
                    strokeColor={getHealthColor(diagnosis.health_score)}
                    showInfo={false}
                    style={{ marginTop: 16 }}
                  />
                </div>

                {/* 诊断摘要 */}
                {diagnosis.summary && (
                  <div style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <h4>诊断摘要</h4>
                    <p style={{ color: '#666' }}>{diagnosis.summary}</p>
                  </div>
                )}

                {/* 发现问题 */}
                {diagnosis.problems && diagnosis.problems.length > 0 && (
                  <div style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <h4 style={{ color: '#f5222d', marginBottom: 12 }}>
                      <WarningOutlined /> 发现问题 ({diagnosis.problems.length}个)
                    </h4>
                    <Timeline>
                      {diagnosis.problems.map((problem) => (
                        <Timeline.Item
                          key={problem.id}
                          dot={getSeverityIcon(problem.severity)}
                          color={getSeverityColor(problem.severity)}
                        >
                          <div>
                            <Tag color={getSeverityColor(problem.severity)}>
                              {problem.severity === 'critical' ? '严重' : 
                               problem.severity === 'warning' ? '警告' : '提示'}
                            </Tag>
                            <strong style={{ marginLeft: 8 }}>{problem.title}</strong>
                            <p style={{ color: '#666', marginTop: 4, marginBottom: 4 }}>
                              {problem.description}
                            </p>
                            {problem.change_percent && (
                              <span style={{ fontSize: 12 }}>
                                变化: {problem.change_percent > 0 ? '+' : ''}
                                {problem.change_percent}%
                              </span>
                            )}
                          </div>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </div>
                )}

                {/* 机会洞察 */}
                {diagnosis.opportunities && diagnosis.opportunities.length > 0 && (
                  <div style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <h4 style={{ color: '#52c41a', marginBottom: 12 }}>
                      <BulbOutlined /> 机会洞察 ({diagnosis.opportunities.length}个)
                    </h4>
                    <List
                      dataSource={diagnosis.opportunities}
                      renderItem={(item) => (
                        <List.Item>
                          <List.Item.Meta
                            title={item.title}
                            description={item.description}
                          />
                          {item.potential_users && (
                            <Tag color="green">
                              潜在 {item.potential_users?.toLocaleString()} 人
                            </Tag>
                          )}
                        </List.Item>
                      )}
                    />
                  </div>
                )}

                {/* 策略建议 */}
                {diagnosis.suggestions && diagnosis.suggestions.length > 0 && (
                  <div style={{ padding: '16px 0' }}>
                    <h4 style={{ marginBottom: 12 }}>
                      <CheckCircleOutlined /> 策略建议
                    </h4>
                    <List
                      dataSource={diagnosis.suggestions}
                      renderItem={(item, index) => (
                        <List.Item>
                          <div>
                            <Tag color="blue">P{item.priority}</Tag>
                            <span style={{ marginLeft: 8 }}>{item.action}</span>
                            {item.expected_outcome && (
                              <p style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                                预期效果: {item.expected_outcome}
                              </p>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  </div>
                )}

                {/* 诊断元信息 */}
                <Divider />
                <div style={{ fontSize: 12, color: '#999' }}>
                  <div>诊断时间: {new Date(diagnosis.generated_at).toLocaleString()}</div>
                  <div>AI模型: {diagnosis.ai_provider} / {diagnosis.ai_model}</div>
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧：趋势图表 */}
        <Col span={14}>
          <Card title="人群规模趋势（近30天）" style={{ marginBottom: 24 }}>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="colorScale" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis tickFormatter={(value) => `${(value/10000).toFixed(0)}万`} />
                  <Tooltip 
                    formatter={(value) => [`${value.toLocaleString()} 人`, '人群规模']}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="scale"
                    stroke="#1890ff"
                    fillOpacity={1}
                    fill="url(#colorScale)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 50, color: '#999' }}>
                暂无趋势数据
              </div>
            )}
          </Card>

          <Card title="活跃用户趋势（近30天）">
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis tickFormatter={(value) => `${(value/10000).toFixed(0)}万`} />
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString()} 人`, '活跃用户']}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="active_users"
                    stroke="#52c41a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 50, color: '#999' }}>
                暂无趋势数据
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default SegmentDetail
