import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

// Agent 工作区 - 作为主要界面
const AgentWorkspace = React.lazy(() => import('./agents/components/AgentWorkspace'))

// 加载占位符
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    flexDirection: 'column',
    gap: '16px',
    background: '#1e1e1e'
  }}>
    <div className="loading-spinner" />
    <p style={{ color: '#a0a0a0' }}>加载中...</p>
  </div>
)

// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('页面错误:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: 40, 
          textAlign: 'center',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e1e1e',
          color: '#d4d4d4'
        }}>
          <h2>页面加载出错</h2>
          <p style={{ color: '#f87171', marginTop: 16 }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: 24, 
              padding: '10px 20px',
              background: '#7ee787',
              color: '#1e1e1e',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            刷新页面
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// 主题初始化
const ThemeInit = () => {
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])
  
  return null
}

function App() {
  return (
    <BrowserRouter>
      <ThemeInit />
      <ErrorBoundary>
        <React.Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="*" element={<AgentWorkspace />} />
          </Routes>
        </React.Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
