import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Badge, Table, Tag } from 'antd'
import {
  TeamOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DashboardOutlined
} from '@ant-design/icons'
import { dashboardApi } from '../services/api'

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
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    return 'error'
  }

  const getHealthIcon = (level) => {
    switch (level) {
      case 'excellent':
      case 'good':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />
      case 'critical':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />
      default:
        return <DashboardOutlined />
    }
  }

  const columns = [
    {
      title: '人群名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a href={`/segments/${record.id}`}>{text}</a>
      )
    },
    {
      title: '优先级',
      dataIndex: 'level',
      key: 'level',
      render: (level) => (
        <Tag color={level === 1 ? 'red' : level === 2 ? 'orange' : 'blue'}>
          P{level}
        </Tag>
      )
    },
    {
      title: '规模',
      dataIndex: 'scale',
      key: 'scale',
      render: (scale) => `${(scale / 10000).toFixed(1)}万`
    },
    {
      title: '健康度',
      dataIndex: 'health_score',
      key: 'health_score',
      render: (score) => (
        score !== null ? (
          <Badge 
            status={getHealthColor(score)} 
            text={`${score}分`}
          />
        ) : (
          <Tag>未诊断</Tag>
        )
      )
    }
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>平台总览</h2>
      
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="战略人群"
              value={stats?.segment_count || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="覆盖用户"
              value={stats?.total_users || 0}
              formatter={(value) => `${(value / 10000).toFixed(1)}万`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="平均健康度"
              value={stats?.diagnosis_stats?.avg_health_score || 0}
              suffix="分"
              valueStyle={{ 
                color: (stats?.diagnosis_stats?.avg_health_score || 0) >= 70 ? '#52c41a' : '#f5222d'
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="诊断次数"
              value={stats?.diagnosis_stats?.total || 0}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card title="健康度分布" loading={loading}>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, color: '#52c41a', fontWeight: 'bold' }}>
                  {stats?.diagnosis_stats?.good || 0}
                </div>
                <div>良好</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, color: '#faad14', fontWeight: 'bold' }}>
                  {stats?.diagnosis_stats?.warning || 0}
                </div>
                <div>需关注</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, color: '#f5222d', fontWeight: 'bold' }}>
                  {stats?.diagnosis_stats?.critical || 0}
                </div>
                <div>严重</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={16}>
          <Card title="人群列表" loading={loading}>
            <Table
              dataSource={stats?.segments || []}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {stats?.recent_diagnoses && stats.recent_diagnoses.length > 0 && (
        <Card title="最近诊断" loading={loading}>
          {stats.recent_diagnoses.map((diagnosis) => (
            <div 
              key={diagnosis.segment_id}
              style={{ 
                padding: '12px 0', 
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              {getHealthIcon(diagnosis.health_level)}
              <span style={{ flex: 1 }}>
                <strong>{diagnosis.segment_name}</strong>
                <span style={{ color: '#666', marginLeft: 8 }}>
                  健康度 {diagnosis.health_score}分 - {diagnosis.summary?.slice(0, 50)}...
                </span>
              </span>
              <Tag color={getHealthColor(diagnosis.health_score)}>
                {diagnosis.health_level}
              </Tag>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

export default Dashboard
