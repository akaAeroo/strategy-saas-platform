import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import Dashboard from './pages/Dashboard'
import Segments from './pages/Segments'
import SegmentDetail from './pages/SegmentDetail'

const { Header, Sider, Content } = Layout

function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider theme="light" width={200}>
          <div style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
            fontSize: 18,
            fontWeight: 'bold',
            color: '#1890ff'
          }}>
            🧠 策略平台
          </div>
          <Menu
            mode="inline"
            defaultSelectedKeys={['dashboard']}
            items={[
              {
                key: 'dashboard',
                icon: <DashboardOutlined />,
                label: <Link to="/">总览</Link>
              },
              {
                key: 'segments',
                icon: <TeamOutlined />,
                label: <Link to="/segments">人群管理</Link>
              }
            ]}
          />
        </Sider>
        <Layout>
          <Header style={{ 
            background: '#fff', 
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <h1 style={{ fontSize: 16, margin: 0 }}>智能策略运营平台</h1>
          </Header>
          <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/segments" element={<Segments />} />
              <Route path="/segments/:id" element={<SegmentDetail />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </BrowserRouter>
  )
}

export default App
