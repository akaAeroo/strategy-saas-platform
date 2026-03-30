import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Lightbulb, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { aiAnalyzeApi } from '../services/api';
import './AIAnalystChat.css';

// Storage key for persisting chat history
const getStorageKey = (sessionId) => `ai_chat_${sessionId}`;

const AIAnalystChat = ({ sessionId, fileInfo, onStrategyGenerated }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    if (sessionId && !hasLoadedHistory) {
      const savedMessages = localStorage.getItem(getStorageKey(sessionId));
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          setMessages(parsed);
          setHasLoadedHistory(true);
          return;
        } catch (e) {
          console.error('Failed to parse saved messages:', e);
        }
      }
      // If no saved messages, start initial analysis
      if (messages.length === 0) {
        startInitialAnalysis();
      }
      setHasLoadedHistory(true);
    }
  }, [sessionId, hasLoadedHistory]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem(getStorageKey(sessionId), JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea without causing jitter
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Initial data analysis
  const startInitialAnalysis = async () => {
    if (!sessionId) return;
    setLoading(true);
    
    const systemMessage = {
      role: 'system',
      content: `📊 已加载数据文件：**${fileInfo?.filename || '未知文件'}**\n共 **${fileInfo?.totalRows?.toLocaleString() || 0}** 条记录，${fileInfo?.headers?.length || 0} 个字段`,
      timestamp: Date.now()
    };
    
    setMessages([systemMessage]);

    try {
      const eventSource = new EventSource(aiAnalyzeApi.getStreamUrl(sessionId));
      
      let assistantMessage = '';
      const messageId = Date.now() + 1;

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '', 
        timestamp: messageId, 
        streaming: true,
        isAnalysis: true
      }]);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'content') {
          assistantMessage += data.data;
          setMessages(prev => prev.map(msg => 
            msg.timestamp === messageId 
              ? { ...msg, content: assistantMessage }
              : msg
          ));
        } else if (data.type === 'done') {
          setMessages(prev => prev.map(msg => 
            msg.timestamp === messageId 
              ? { ...msg, streaming: false }
              : msg
          ));
          eventSource.close();
          setLoading(false);
        } else if (data.type === 'error') {
          eventSource.close();
          setLoading(false);
          setMessages(prev => [...prev, { 
            role: 'error', 
            content: '分析出错：' + data.data, 
            timestamp: Date.now() 
          }]);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setLoading(false);
      };

    } catch (error) {
      console.error('初始分析失败:', error);
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || !sessionId || loading) return;

    const userMessage = input.trim();
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage, 
      timestamp: Date.now() 
    }]);

    try {
      const eventSource = new EventSource(aiAnalyzeApi.getStreamUrl(sessionId, userMessage));
      
      let assistantMessage = '';
      const messageId = Date.now();

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '', 
        timestamp: messageId, 
        streaming: true 
      }]);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'content') {
          assistantMessage += data.data;
          setMessages(prev => prev.map(msg => 
            msg.timestamp === messageId 
              ? { ...msg, content: assistantMessage }
              : msg
          ));
        } else if (data.type === 'done') {
          setMessages(prev => prev.map(msg => 
            msg.timestamp === messageId 
              ? { ...msg, streaming: false }
              : msg
          ));
          eventSource.close();
          setLoading(false);
        } else if (data.type === 'error') {
          eventSource.close();
          setLoading(false);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setLoading(false);
      };

    } catch (error) {
      console.error('发送消息失败:', error);
      setLoading(false);
    }
  };

  // Generate strategy - FIXED VERSION
  const generateStrategy = async () => {
    if (!sessionId || generatingStrategy || loading) return;
    
    setGeneratingStrategy(true);
    setLoading(true);
    
    const promptText = '请基于以上数据分析，生成一份完整的运营策略方案，包含：\n1. 策略名称\n2. 目标人群细分\n3. 核心目标\n4. 执行方案（触达渠道、时机、文案）\n5. 权益设计\n6. 预期效果\n7. 执行步骤';
    
    // Add visible user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: '请生成运营策略方案',
      timestamp: Date.now()
    }]);

    try {
      const eventSource = new EventSource(aiAnalyzeApi.getStreamUrl(sessionId, promptText));
      
      let strategyContent = '';
      const messageId = Date.now();

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '', 
        timestamp: messageId, 
        streaming: true,
        isStrategy: true
      }]);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'content') {
          strategyContent += data.data;
          setMessages(prev => prev.map(msg => 
            msg.timestamp === messageId 
              ? { ...msg, content: strategyContent }
              : msg
          ));
        } else if (data.type === 'done') {
          setMessages(prev => prev.map(msg => 
            msg.timestamp === messageId 
              ? { ...msg, streaming: false }
              : msg
          ));
          
          // Parse and pass strategy to parent
          const strategy = parseStrategy(strategyContent);
          onStrategyGenerated?.(strategy);
          
          eventSource.close();
          setGeneratingStrategy(false);
          setLoading(false);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Strategy generation error:', error);
        eventSource.close();
        setGeneratingStrategy(false);
        setLoading(false);
        setMessages(prev => [...prev, {
          role: 'error',
          content: '策略生成失败，请重试',
          timestamp: Date.now()
        }]);
      };

    } catch (error) {
      console.error('生成策略失败:', error);
      setGeneratingStrategy(false);
      setLoading(false);
    }
  };

  // Parse strategy content
  const parseStrategy = (content) => {
    try {
      // Try to extract JSON
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       content.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const strategy = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return { type: 'structured', data: strategy, raw: content };
      }
    } catch (e) {
      console.error('JSON parse failed:', e);
    }
    return { type: 'text', data: content, raw: content };
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    '分析高价值用户特征',
    '找出流失风险用户',
    '统计城市分布',
    '分析注册时间趋势'
  ];

  // Render Markdown content
  const renderMessageContent = (content) => {
    if (!content) return null;
    
    // Simple Markdown conversion
    let html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.replace(/```\w*\n?/, '').replace(/```$/, '');
        return `<pre><code>${code}</code></pre>`;
      })
      .replace(/\n/g, '<br>');
    
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="ai-analyst-chat">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title">
          <Bot size={20} />
          <span>AI 数据分析师</span>
          {fileInfo && (
            <span className="file-badge">
              <FileSpreadsheet size={14} />
              {fileInfo.filename}
            </span>
          )}
        </div>
        <button 
          className="strategy-btn"
          onClick={generateStrategy}
          disabled={generatingStrategy || loading || !sessionId}
        >
          {generatingStrategy ? <Loader2 className="spin" size={16} /> : <TrendingUp size={16} />}
          生成策略
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.filter(m => !m.isHidden).map((msg, index) => (
          <div 
            key={index} 
            className={`message ${msg.role} ${msg.isStrategy ? 'strategy' : ''} ${msg.isAnalysis ? 'analysis' : ''}`}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? <User size={16} /> : 
               msg.role === 'error' ? '⚠️' : <Bot size={16} />}
            </div>
            <div className="message-content">
              <div className="message-text">
                {renderMessageContent(msg.content)}
              </div>
              {msg.streaming && <span className="typing">▊</span>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="quick-prompts">
        {quickPrompts.map((prompt, i) => (
          <button 
            key={i} 
            className="quick-prompt"
            onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
            disabled={loading}
          >
            <Lightbulb size={12} />
            {prompt}
          </button>
        ))}
      </div>

      {/* Input area - FIXED to prevent jitter */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="询问关于数据的问题，如：统计各价值等级用户数..."
            disabled={loading}
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button 
            className="send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            {loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAnalystChat;
