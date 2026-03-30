import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { getAllAgents, getAgentById } from '../config/agentConfig'
import { useAgentStore } from '../stores/agentStore'
import './AgentWorkspace.css'

// Agent 列表侧边栏组件
const AgentListSidebar = ({ agents, activeId, onSelect, onNewChat }) => {
  // 按类别分组
  const agentsByCategory = agents.reduce((acc, agent) => {
    const cat = agent.category || '其他'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(agent)
    return acc
  }, {})

  return (
    <div className="agent-list-sidebar">
      <div className="agent-list-header">
        <h2>AI Agents</h2>
        <button className="new-chat-btn" onClick={onNewChat} title="新对话">
          ✚
        </button>
      </div>
      <div className="agent-list-content">
        {Object.entries(agentsByCategory).map(([category, categoryAgents]) => (
          <div key={category} className="agent-category">
            <h4 className="agent-category-title">{category}</h4>
            {categoryAgents.map(agent => (
              <div
                key={agent.id}
                className={`agent-list-item ${agent.id === activeId ? 'active' : ''}`}
                onClick={() => onSelect(agent.id)}
              >
                <div 
                  className="agent-list-avatar"
                  style={{ background: agent.color || '#7ee787' }}
                >
                  {agent.icon}
                </div>
                <div className="agent-list-info">
                  <p className="agent-list-name">{agent.name}</p>
                  <p className="agent-list-desc">{agent.description}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Memory 面板组件
const MemoryPanel = ({ agent }) => {
  const [activeTab, setActiveTab] = useState('short')
  const { workspaces } = useAgentStore()
  const workspace = workspaces[agent?.id]
  const memories = workspace?.memory?.shortTerm || []

  const filteredMemories = memories.filter(m => 
    m.content?.toLowerCase().includes(workspace?.memory?.searchQuery?.toLowerCase() || '')
  )

  return (
    <div className="memory-panel">
      <div className="memory-panel-header">
        <h3>💭 Memory</h3>
        <div className="memory-search">
          <input 
            type="text" 
            placeholder="搜索记忆..."
            value={workspace?.memory?.searchQuery || ''}
            onChange={(e) => useAgentStore.getState().setMemorySearchQuery(agent.id, e.target.value)}
          />
        </div>
      </div>
      <div className="memory-tabs">
        <button 
          className={`memory-tab ${activeTab === 'short' ? 'active' : ''}`}
          onClick={() => setActiveTab('short')}
        >
          短期
        </button>
        <button 
          className={`memory-tab ${activeTab === 'medium' ? 'active' : ''}`}
          onClick={() => setActiveTab('medium')}
        >
          中期
        </button>
        <button 
          className={`memory-tab ${activeTab === 'long' ? 'active' : ''}`}
          onClick={() => setActiveTab('long')}
        >
          长期
        </button>
      </div>
      <div className="memory-content">
        {filteredMemories.length > 0 ? (
          <div className="memory-list">
            {filteredMemories.map((memory, idx) => (
              <div key={idx} className="memory-item">
                <div className="memory-item-header">
                  <span className="memory-item-type">{memory.type || '对话'}</span>
                  <span className="memory-item-time">
                    {new Date(memory.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="memory-item-content">{memory.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="memory-empty">
            <div className="memory-empty-icon">📝</div>
            <p>暂无记忆记录</p>
          </div>
        )}
      </div>
    </div>
  )
}

// 聊天消息组件
const ChatMessage = ({ message, agent }) => {
  const isUser = message.role === 'user'
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content)
  }

  return (
    <div className={`chat-message ${message.role}`}>
      <div 
        className="message-avatar"
        style={{ background: isUser ? '#4a9eff' : (agent?.color || '#7ee787') }}
      >
        {isUser ? '👤' : agent?.icon}
      </div>
      <div className="message-content">
        <div className="message-bubble">
          {message.isStreaming ? (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : (
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
          
          {/* 附件显示 */}
          {message.attachments?.map((file, idx) => (
            <div key={idx} className="message-attachments">
              <div className="message-file">
                <span className="message-file-icon">📎</span>
                <span className="message-file-name">{file.name}</span>
              </div>
            </div>
          ))}
          
          {/* 截图显示 */}
          {message.screenshot && (
            <div className="message-screenshot">
              <img src={message.screenshot} alt="截图" />
            </div>
          )}
        </div>
        <div className="message-meta">
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          {!isUser && !message.isStreaming && (
            <div className="message-actions">
              <button className="message-action-btn" onClick={copyToClipboard} title="复制">
                📋
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 主工作区组件
const AgentWorkspace = () => {
  const {
    activeAgentId,
    workspaces,
    switchAgent,
    addMessage,
    updateMessage,
    clearConversation,
    setInputText,
    addUploadedFile,
    removeUploadedFile,
    clearUploadedFiles,
    addScreenshot,
    setScreenshotMode
  } = useAgentStore()

  const [isLoading, setIsLoading] = useState(false)
  const [screenshotMode, setLocalScreenshotMode] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionRect, setSelectionRect] = useState(null)
  
  const chatRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  // 获取当前 Agent
  const currentAgent = activeAgentId ? getAgentById(activeAgentId) : null
  const agents = getAllAgents()
  
  // 获取当前工作区状态
  const currentWorkspace = activeAgentId ? workspaces[activeAgentId] : null
  const conversations = currentWorkspace?.conversations || []
  const inputText = currentWorkspace?.inputText || ''
  const uploadedFiles = currentWorkspace?.uploadedFiles || []

  // 自动滚动到底部
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [conversations])

  // 默认选中第一个 Agent
  useEffect(() => {
    if (!activeAgentId && agents.length > 0) {
      switchAgent(agents[0].id)
    }
  }, [])

  // 截图功能 - 开始选择
  const startScreenshot = () => {
    setLocalScreenshotMode(true)
    setScreenshotMode(activeAgentId, true)
    document.body.style.cursor = 'crosshair'
  }

  // 截图功能 - 取消
  const cancelScreenshot = () => {
    setLocalScreenshotMode(false)
    setIsSelecting(false)
    setSelectionRect(null)
    setScreenshotMode(activeAgentId, false)
    document.body.style.cursor = 'default'
  }

  // 截图功能 - 鼠标事件
  const handleMouseDown = useCallback((e) => {
    if (!screenshotMode) return
    setIsSelecting(true)
    setSelectionStart({ x: e.clientX, y: e.clientY })
  }, [screenshotMode])

  const handleMouseMove = useCallback((e) => {
    if (!screenshotMode || !isSelecting || !selectionStart) return
    
    const rect = {
      left: Math.min(selectionStart.x, e.clientX),
      top: Math.min(selectionStart.y, e.clientY),
      width: Math.abs(e.clientX - selectionStart.x),
      height: Math.abs(e.clientY - selectionStart.y)
    }
    setSelectionRect(rect)
  }, [screenshotMode, isSelecting, selectionStart])

  const handleMouseUp = useCallback(async () => {
    if (!screenshotMode || !isSelecting || !selectionRect) return
    
    // 执行截图
    try {
      // 使用 html2canvas 或类似库截图
      // 这里先使用简单的 canvas 截图作为演示
      const canvas = document.createElement('canvas')
      canvas.width = selectionRect.width
      canvas.height = selectionRect.height
      const ctx = canvas.getContext('2d')
      
      // 截取屏幕区域（简化版，实际应使用 html2canvas）
      ctx.fillStyle = '#1e1e1e'
      ctx.fillRect(0, 0, selectionRect.width, selectionRect.height)
      ctx.strokeStyle = '#7ee787'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, selectionRect.width, selectionRect.height)
      ctx.fillStyle = '#7ee787'
      ctx.font = '14px sans-serif'
      ctx.fillText('截图区域预览', 10, 24)
      
      const screenshotData = canvas.toDataURL('image/png')
      addScreenshot(activeAgentId, screenshotData)
      
      // 添加一条带截图的消息
      addMessage(activeAgentId, {
        role: 'user',
        content: '我发送了一张截图',
        screenshot: screenshotData,
        timestamp: Date.now()
      })
      
    } catch (err) {
      console.error('截图失败:', err)
    }
    
    cancelScreenshot()
  }, [screenshotMode, isSelecting, selectionRect, activeAgentId])

  // 全局鼠标事件监听
  useEffect(() => {
    if (screenshotMode) {
      document.addEventListener('mousedown', handleMouseDown)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [screenshotMode, handleMouseDown, handleMouseMove, handleMouseUp])

  // 发送消息
  const handleSend = async () => {
    if (!inputText.trim() && uploadedFiles.length === 0) return
    if (!currentAgent) return

    const messageContent = inputText.trim()
    const attachments = [...uploadedFiles]
    
    // 清空输入
    setInputText(activeAgentId, '')
    clearUploadedFiles(activeAgentId)

    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: messageContent || (attachments.length > 0 ? `发送了 ${attachments.length} 个文件` : ''),
      attachments: attachments.length > 0 ? attachments.map(f => ({ name: f.name, size: f.size })) : undefined,
      timestamp: Date.now()
    }
    addMessage(activeAgentId, userMessage)

    // 添加 AI 正在输入的占位消息
    const assistantMessageId = `msg_${Date.now()}_assistant`
    addMessage(activeAgentId, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now()
    })

    setIsLoading(true)

    try {
      // 构建消息历史
      const messageHistory = conversations.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // 调用流式 API
      console.log('[Agent] 发送消息到:', currentAgent.id, messageContent)
      const response = await fetch(`/api/agents/${currentAgent.id}/execute-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: messageContent,
          history: messageHistory,
          files: attachments.map(f => f.id)
        })
      })

      console.log('[Agent] 响应状态:', response.status, response.ok)
      if (!response.ok) throw new Error(`请求失败: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      try {
        let chunkCount = 0
        while (true) {
          const { done, value } = await reader.read()
          chunkCount++
          console.log('[Agent] 收到数据块:', chunkCount, 'done:', done, 'size:', value?.length || 0)
          
          // 解码数据块
          const chunk = decoder.decode(value, { stream: !done })
          buffer += chunk
          console.log('[Agent] 缓冲区:', buffer.substring(0, 200))
          
          // 处理完整的行
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留不完整的行
          
          for (const line of lines) {
            const trimmedLine = line.trim()
            console.log('[Agent] 处理行:', trimmedLine.substring(0, 100))
            if (!trimmedLine.startsWith('data: ')) continue
            
            const dataStr = trimmedLine.slice(6).trim()
            if (!dataStr || dataStr === '[DONE]') continue
            
            console.log('[Agent] 解析数据:', dataStr.substring(0, 100))
            try {
              const data = JSON.parse(dataStr)
              
              const logContent = typeof (data.data || data.content) === 'string' 
                ? (data.data || data.content || '').substring(0, 50)
                : JSON.stringify(data.data || data.content || '').substring(0, 50)
              console.log('[Agent] 数据类型:', data.type, '内容:', logContent)
              if (data.type === 'start') {
                // 开始事件，不需要更新内容
                console.log('[Agent] 开始流')
              } else if (data.type === 'content') {
                const text = data.data || data.content || ''
                console.log('[Agent] 收到内容:', text.substring(0, 50))
                if (text) {
                  fullContent += text
                  updateMessage(activeAgentId, assistantMessageId, {
                    content: fullContent,
                    isStreaming: true
                  })
                }
              } else if (data.type === 'complete' || data.type === 'done') {
                console.log('[Agent] 完成流')
                updateMessage(activeAgentId, assistantMessageId, {
                  content: fullContent || '完成',
                  isStreaming: false
                })
              } else if (data.type === 'error') {
                console.log('[Agent] 错误:', data.error)
                updateMessage(activeAgentId, assistantMessageId, {
                  content: `❌ 错误: ${data.error || data.message || '未知错误'}`,
                  isStreaming: false
                })
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e, '数据:', dataStr)
            }
          }
          
          if (done) break
        }
        
        // 处理剩余缓冲区
        if (buffer.trim()) {
          const trimmedLine = buffer.trim()
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6).trim()
            if (dataStr && dataStr !== '[DONE]') {
              try {
                const data = JSON.parse(dataStr)
                if (data.type === 'content') {
                  const text = data.data || data.content || ''
                  if (text) {
                    fullContent += text
                  }
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
        
        // 确保最终状态更新
        updateMessage(activeAgentId, assistantMessageId, {
          content: fullContent || '完成',
          isStreaming: false
        })
      } catch (streamError) {
        console.error('流读取错误:', streamError)
        updateMessage(activeAgentId, assistantMessageId, {
          content: fullContent || '❌ 连接中断',
          isStreaming: false
        })
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      updateMessage(activeAgentId, assistantMessageId, {
        content: '❌ 发送失败，请稍后重试',
        isStreaming: false
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 键盘快捷键
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  // 文件上传
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    for (const file of files) {
      // 上传到服务器
      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/upload/excel', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const result = await response.json()
          addUploadedFile(activeAgentId, {
            id: result.data.uploadId,
            name: file.name,
            size: file.size,
            path: result.data.filePath
          })
        }
      } catch (err) {
        console.error('上传失败:', err)
      }
    }

    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 新对话
  const handleNewChat = () => {
    if (activeAgentId) {
      clearConversation(activeAgentId)
    }
  }

  return (
    <div className="agent-workspace-obsidian">
      {/* Agent 列表侧边栏 */}
      <AgentListSidebar
        agents={agents}
        activeId={activeAgentId}
        onSelect={switchAgent}
        onNewChat={handleNewChat}
      />

      {/* 主聊天区域 */}
      <div className="agent-workspace-main">
        {/* 顶部标题栏 */}
        <div className="workspace-header">
          <div className="workspace-header-left">
            {currentAgent && (
              <div className="workspace-header-agent">
                <div 
                  className="workspace-header-avatar"
                  style={{ background: currentAgent.color }}
                >
                  {currentAgent.icon}
                </div>
                <div className="workspace-header-info">
                  <h3>{currentAgent.name}</h3>
                  <p>{currentAgent.description}</p>
                </div>
              </div>
            )}
          </div>
          <div className="workspace-header-actions">
            <button 
              className={`header-action-btn ${screenshotMode ? 'screenshot-mode' : ''}`}
              onClick={startScreenshot}
              title="截图"
            >
              📷
            </button>
            <button 
              className="header-action-btn"
              onClick={handleNewChat}
              title="清空对话"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* 聊天消息区域 */}
        <div className="workspace-chat" ref={chatRef}>
          {conversations.length === 0 ? (
            <div className="chat-empty-state">
              <div 
                className="chat-empty-avatar"
                style={{ background: currentAgent?.color || '#7ee787' }}
              >
                {currentAgent?.icon || '🤖'}
              </div>
              <h3>{currentAgent?.name || '选择一个 Agent'}</h3>
              <p>{currentAgent?.description || '从左侧列表选择一个 Agent 开始对话'}</p>
              <div className="chat-empty-actions">
                {currentAgent?.suggestedQueries?.map((query, idx) => (
                  <button 
                    key={idx}
                    className="empty-action-btn"
                    onClick={() => {
                      setInputText(activeAgentId, query)
                      textareaRef.current?.focus()
                    }}
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            conversations.map((msg, idx) => (
              <ChatMessage 
                key={msg.id || idx} 
                message={msg} 
                agent={currentAgent}
              />
            ))
          )}
        </div>

        {/* 输入区域 */}
        <div className="workspace-input-area">
          {/* 文件预览 */}
          {uploadedFiles.length > 0 && (
            <div className="input-files-preview">
              {uploadedFiles.map(file => (
                <div key={file.id} className="file-preview-item">
                  <span className="file-preview-icon">📎</span>
                  <span className="file-preview-name">{file.name}</span>
                  <button 
                    className="file-preview-remove"
                    onClick={() => removeUploadedFile(activeAgentId, file.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="input-container">
            <textarea
              ref={textareaRef}
              className="input-textarea"
              placeholder={currentAgent ? `给 ${currentAgent.name} 发送消息...` : '选择一个 Agent 开始对话'}
              value={inputText}
              onChange={(e) => setInputText(activeAgentId, e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={!currentAgent || isLoading}
            />
            <div className="input-toolbar">
              <div className="input-toolbar-left">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <button 
                  className="toolbar-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="上传文件"
                  disabled={!currentAgent || isLoading}
                >
                  📎
                </button>
                <button 
                  className={`toolbar-btn ${screenshotMode ? 'active' : ''}`}
                  onClick={startScreenshot}
                  title="截图"
                >
                  📷
                </button>
              </div>
              <div className="input-toolbar-right">
                <span className="input-hint">Cmd + Enter 发送</span>
                <button 
                  className="send-btn"
                  onClick={handleSend}
                  disabled={(!inputText.trim() && uploadedFiles.length === 0) || isLoading}
                >
                  {isLoading ? '发送中...' : '发送'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧 Memory 面板 */}
      <MemoryPanel agent={currentAgent} />

      {/* 截图选择框 */}
      {screenshotMode && selectionRect && (
        <div 
          className="screenshot-selection"
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height
          }}
        />
      )}

      {/* 截图工具栏 */}
      {screenshotMode && (
        <div className="screenshot-toolbar">
          <span style={{ color: '#7ee787', fontSize: '13px' }}>
            🖱️ 拖动选择截图区域
          </span>
          <button className="screenshot-btn" onClick={cancelScreenshot}>
            取消
          </button>
        </div>
      )}
    </div>
  )
}

export default AgentWorkspace
