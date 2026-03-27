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
  ChevronRight
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Segments from './pages/Segments'
import SegmentDetail from './pages/SegmentDetail'
import './App.css'

// 侧边栏导航项
const navItems = [
  { path: '/', icon: LayoutDashboard, label: '总览', badge: null },
  { path: '/segments', icon: Users, label: '人群管理', badge: null },
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
      {/* 移动端遮罩 */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo">
            <Sparkles className="logo-icon" />
            <span className="logo-text">Strategy AI</span>
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className="sidebar-search">
          <Search size={16} />
          <input type="text" placeholder="搜索..." />
          <span className="shortcut">⌘K</span>
        </div>
        
        {/* 导航 */}
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
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </Link>
            )
          })}
        </nav>
        
        {/* 底部 */}
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
          <span className="notification-dot" />
        </button>
        <button className="header-btn">
          <Settings size={18} />
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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/segments" element={<Segments />} />
            <Route path="/segments/:id" element={<SegmentDetail />} />
          </Routes>
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
