import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Button, Space, Badge, Tooltip, message } from 'antd'
import {
  MedicineBoxOutlined,
  EyeOutlined,
  ReloadOutlined,
  TrophyOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { segmentsApi } from '../services/api'

const Segments = () => {
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)
  const [diagnosing, setDiagnosing] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    fetchSegments()
  }, [])

  const fetchSegments = async () => {
    try {
      setLoading(true)
      const list = await segmentsApi.getList()
      
      // 获取每个人群的诊断信息
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
      message.error('获取人群列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDiagnose = async (segment) => {
    try {
      setDiagnosing({ ...diagnosing, [segment.id]: true })
      message.loading({ content: `正在诊断 ${segment.name}...`, key: segment.id })
      
      const result = await segmentsApi.diagnose(segment.id)
      
      message.success({ content: '诊断完成', key: segment.id })
      
      // 更新列表
      setSegments(segments.map(s => 
        s.id === segment.id 
          ? { ...s, diagnosis: result, hasDiagnosis: true }
          : s
      ))
    } catch (error) {
      message.error({ content: '诊断失败: ' + error.message, key: segment.id })
    } finally {
      setDiagnosing({ ...diagnosing, [segment.id]: false })
    }
  }

  const getLevelIcon = (level) => {
    const icons = {
      1: <TrophyOutlined style={{ color: '#ffd700' }} />,
      2: <TeamOutlined style={{ color: '#c0c0c0' }} />,
      3: <UserOutlined style={{ color: '#cd7f32' }} />
    }
    return icons[level] || null
  }

  const getHealthBadge = (score) => {
    if (score === undefined || score === null) return <Tag>未诊断</Tag>
    if (score >= 80) return <Badge status="success" text={`${score}分`} />
    if (score >= 60) return <Badge status="warning" text={`${score}分`} />
    return <Badge status="error" text={`${score}分`} />
  }

  const getProblemSummary = (diagnosis) => {
    if (!diagnosis) return '-'
    const problems = diagnosis.problems || []
    const critical = problems.filter(p => p.severity === 'critical').length
    const warning = problems.filter(p => p.severity === 'warning').length
    
    if (critical > 0) return <Tag color="red">{critical}个严重问题</Tag>
    if (warning > 0) return <Tag color="orange">{warning}个警告</Tag>
    return <Tag color="green">健康</Tag>
  }

  const columns = [
    {
      title: '人群名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {getLevelIcon(record.level)}
          <a onClick={() => navigate(`/segments/${record.id}`)}>{text}</a>
        </Space>
      )
    },
    {
      title: '优先级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
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
      width: 120,
      render: (scale) => `${(scale / 10000).toFixed(1)}万`
    },
    {
      title: '健康度',
      key: 'health',
      width: 120,
      render: (_, record) => getHealthBadge(record.diagnosis?.health_score)
    },
    {
      title: '问题状态',
      key: 'problems',
      render: (_, record) => getProblemSummary(record.diagnosis)
    },
    {
      title: '诊断时间',
      key: 'diagnosis_time',
      width: 180,
      render: (_, record) => {
        if (!record.hasDiagnosis) return '-'
        const time = record.diagnosis?.generated_at
        return time ? new Date(time).toLocaleString() : '-'
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<MedicineBoxOutlined />}
            loading={diagnosing[record.id]}
            onClick={() => handleDiagnose(record)}
          >
            {record.hasDiagnosis ? '重新诊断' : 'AI诊断'}
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/segments/${record.id}`)}
          >
            详情
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2>人群管理</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchSegments}>
          刷新
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={segments}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <div style={{ marginTop: 16, color: '#666' }}>
        <p>💡 提示：点击"AI诊断"按钮，系统将调用云端大模型分析人群健康度并生成诊断报告。</p>
      </div>
    </div>
  )
}

export default Segments
