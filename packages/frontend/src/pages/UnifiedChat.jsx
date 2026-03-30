import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Trash2, 
  MoreHorizontal,
  FileText,
  Globe,
  Target,
  BarChart3,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import './UnifiedChat.css';

// Skill 配置
const SKILLS = [
  { id: 'chat', name: '对话', icon: '💬', description: '通用对话咨询' },
  { id: 'data_analysis', name: '数据分析', icon: '📊', description: '上传文件分析' },
  { id: 'web_search', name: '网页搜索', icon: '🌐', description: '搜索网络信息' },
  { id: 'strategy', name: '策略生成', icon: '🎯', description: '生成运营策略' }
];

const UnifiedChat = () => {
  // Store
  const {
    sessions,
    currentSessionId,
    isLoading,
    _hasHydrated,
    getCurrentSession,
    createSession,
    switchSession,
    deleteSession,
    addMessage,
    updateMessage,
    addFile,
    setLoading
  } = useChatStore();

  // 本地状态
  const [input, setInput] = useState('');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  
  const currentSession = getCurrentSession();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // 初始化会话 - 等待数据恢复后再判断
  useEffect(() => {
    if (_hasHydrated && !currentSessionId && sessions.length === 0) {
      createSession();
    }
  }, [_hasHydrated, sessions.length, currentSessionId]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;
    if (!currentSessionId) return;

    const message = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 如果有文件，先上传文件
    let uploadedFiles = [];
    if (selectedFiles.length > 0) {
      setLoading(true);
      try {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file.file);
          formData.append('sessionId', currentSessionId);

          const response = await fetch('/api/v2/chat/send', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();
          if (result.code === 0 && result.data?.file) {
            uploadedFiles.push(result.data.file);
            // 添加到 store
            addFile(currentSessionId, result.data.file);
          }
        }
      } catch (error) {
        console.error('上传文件失败:', error);
        addMessage(currentSessionId, {
          role: 'error',
          content: '文件上传失败: ' + error.message
        });
        setLoading(false);
        return;
      }
    }

    // 添加用户消息（包含文件信息）
    addMessage(currentSessionId, {
      role: 'user',
      content: message,
      files: uploadedFiles
    });

    setSelectedFiles([]);
    setLoading(true);

    // 构建 SSE 请求参数
    const params = new URLSearchParams({
      message,
      sessionId: currentSessionId
    });

    if (selectedSkill) {
      params.append('skill', selectedSkill);
    }

    // 添加文件ID
    if (uploadedFiles.length > 0) {
      params.append('fileId', uploadedFiles[0].id);
    }

    try {
      const eventSource = new EventSource(`/api/v2/chat/stream?${params.toString()}`);
      
      let assistantMessageId = null;
      let fullContent = '';

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'start':
            // 创建助手消息占位
            assistantMessageId = addMessage(currentSessionId, {
              role: 'assistant',
              content: '',
              skill: data.skill?.id,
              skillName: data.skill?.name,
              streaming: true
            });
            break;

          case 'content':
            fullContent += data.data;
            if (assistantMessageId) {
              updateMessage(currentSessionId, assistantMessageId, {
                content: fullContent
              });
            }
            break;

          case 'status':
            // 可以显示状态信息
            console.log('Status:', data.data);
            break;

          case 'done':
            if (assistantMessageId) {
              updateMessage(currentSessionId, assistantMessageId, {
                content: fullContent,
                streaming: false,
                data: data.completeData
              });
            }
            eventSource.close();
            setLoading(false);
            break;

          case 'error':
            addMessage(currentSessionId, {
              role: 'error',
              content: data.data
            });
            eventSource.close();
            setLoading(false);
            break;
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setLoading(false);
      };

    } catch (error) {
      console.error('Send error:', error);
      setLoading(false);
    }
  };

  // 处理文件选择
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files.map(f => ({
      name: f.name,
      size: f.size,
      file: f
    }))]);
    // 自动选择数据分析 Skill
    if (files.length > 0) {
      setSelectedSkill('data_analysis');
    }
  };

  // 移除已选文件
  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 键盘处理
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 渲染消息
  const renderMessage = (msg) => {
    const isUser = msg.role === 'user';
    const isError = msg.role === 'error';

    return (
      <div 
        key={msg.id} 
        className={`message ${msg.role} ${msg.streaming ? 'streaming' : ''}`}
      >
        <div className="message-avatar">
          {isUser ? '👤' : isError ? '⚠️' : msg.skillName?.[0] || '🤖'}
        </div>
        <div className="message-content">
          {msg.skillName && !isUser && !isError && (
            <div className="message-skill-badge">
              {SKILLS.find(s => s.id === msg.skill)?.icon} {msg.skillName}
            </div>
          )}
          <div className="message-text">
            {msg.files && msg.files.length > 0 && (
              <div className="message-files">
                {msg.files.map((file, i) => (
                  <span key={i} className="message-file">
                    📎 {file.name || file.filename}
                  </span>
                ))}
              </div>
            )}
            <div dangerouslySetInnerHTML={{ 
              __html: msg.content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>')
            }} />
          </div>
          {msg.streaming && <span className="typing">▊</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="unified-chat">
      {/* 侧边栏 - 会话列表 */}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={createSession}>
            <Plus size={16} />
            新建会话
          </button>
        </div>

        <div className="sessions-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
              onClick={() => switchSession(session.id)}
            >
              <MessageSquare size={16} />
              <span className="session-title">{session.title}</span>
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* 主聊天区域 */}
      <main className="chat-main">
        {/* 顶部栏 */}
        <header className="chat-header">
          <button 
            className="toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
          <h1>Strategy AI</h1>
          <div className="header-actions">
            {currentSession && (
              <button 
                className="clear-btn"
                onClick={() => useChatStore.getState().clearCurrentSession()}
              >
                清空
              </button>
            )}
          </div>
        </header>

        {/* 消息区域 */}
        <div className="messages-container">
          {!currentSession || currentSession.messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon">🎯</div>
              <h2>今天有什么可以帮到你？</h2>
              <p>我可以帮你分析数据、搜索信息、生成策略</p>
              
              <div className="quick-actions">
                <button onClick={() => fileInputRef.current?.click()}>
                  <FileText size={16} />
                  上传文件分析
                </button>
                <button onClick={() => setSelectedSkill('web_search')}>
                  <Globe size={16} />
                  搜索网络信息
                </button>
                <button onClick={() => setSelectedSkill('strategy')}>
                  <Target size={16} />
                  生成运营策略
                </button>
              </div>
            </div>
          ) : (
            <>
              {currentSession.messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入区域 */}
        <div className="input-area">
          {/* 已选文件 */}
          {selectedFiles.length > 0 && (
            <div className="selected-files">
              {selectedFiles.map((file, i) => (
                <span key={i} className="selected-file">
                  📎 {file.name}
                  <button onClick={() => removeSelectedFile(i)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 输入框 */}
          <div className="input-box">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="给 Strategy AI 发送消息..."
              disabled={isLoading}
              rows={1}
            />
            
            <div className="input-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              <button 
                className="action-btn"
                onClick={() => fileInputRef.current?.click()}
                title="上传文件"
              >
                <FileText size={18} />
              </button>

              <button
                className={`send-btn ${!input.trim() && selectedFiles.length === 0 ? 'disabled' : ''}`}
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && selectedFiles.length === 0)}
              >
                {isLoading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
          </div>

          {/* Skill 选择器 */}
          <div className="skill-selector">
            {SKILLS.map(skill => (
              <button
                key={skill.id}
                className={`skill-btn ${selectedSkill === skill.id ? 'active' : ''}`}
                onClick={() => setSelectedSkill(selectedSkill === skill.id ? null : skill.id)}
                title={skill.description}
              >
                <span className="skill-icon">{skill.icon}</span>
                <span className="skill-name">{skill.name}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UnifiedChat;
