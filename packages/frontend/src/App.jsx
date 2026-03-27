import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Bell, 
  Search,
  Menu,
  X,
  Moon,
  Sun,
  Sparkles,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react'
import './App.css'

// 页面组件
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Segments = React.lazy(() => import('./pages/Segments'))
const SegmentDetail = React.lazy(() => import('./pages/SegmentDetail'))
const DataImport = React.lazy(() => import('./pages/DataImport'))

// 加载占位符
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '60vh',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <div className="loading-spinner" />
    <p>加载中...</p>
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
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>页面加载出错</h2>
          <p style={{ color: '#ef4444', marginTop: 16 }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: 24, 
              padding: '10px 20px',
              background: '#2eaadc',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
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

// 侧边栏导航项
const navItems = [
  { path: '/', icon: LayoutDashboard, label: '总览', badge: null },
  { path: '/segments', icon: Users, label: '人群管理', badge: null },
  { path: '/import', icon: FileSpreadsheet, label: '数据导入', badge: null },
]

// 主题切换组件
const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false)
  
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true)
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])
  
  const toggle = () => {
    setIsDark(!isDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark')
    localStorage.setItem('theme', isDark ? 'light' : 'dark')
  }
  
  return (
    <button onClick={toggle} className="theme-toggle">
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

// 侧边栏组件
const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation()
  
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Sparkles className="logo-icon" />
            <span className="logo-text">Strategy AI</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || 
                            (item.path !== '/' && location.pathname.startsWith(item.path))
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onClose()}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">
              <Users size={16} />
            </div>
            <div className="user-meta">
              <span className="user-name">运营人员</span>
              <span className="user-role">管理员</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </aside>
    </>
  )
}

// 顶部栏组件
const Header = ({ onMenuClick }) => {
  const location = useLocation()
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return '总览'
      case '/segments': return '人群管理'
      case '/import': return '数据导入'
      default:
        if (location.pathname.startsWith('/segments/')) return '人群详情'
        return '智能策略平台'
    }
  }
  
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div className="breadcrumb">
          <span className="workspace">智能策略平台</span>
          <ChevronRight size={16} />
          <span className="page-title">{getPageTitle()}</span>
        </div>
      </div>
      
      <div className="header-right">
        <button className="header-btn">
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}

// 主布局组件
const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-wrapper">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="main-content">
          <ErrorBoundary>
            <React.Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/segments" element={<Segments />} />
                <Route path="/segments/:id" element={<SegmentDetail />} />
                <Route path="/import" element={<DataImport />} />
              </Routes>
            </React.Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}

export default App
