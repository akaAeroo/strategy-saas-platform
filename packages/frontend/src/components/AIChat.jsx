import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { chatApi } from '../services/api';
import './AIChat.css';

const AIChat = ({ uploadData, onStrategyGenerated }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const messagesEndRef = useRef(null);

  // 创建会话
  useEffect(() => {
    const createSession = async () => {
      try {
        const data = await chatApi.createSession(uploadData);
        if (data && data.sessionId) {
          setSessionId(data.sessionId);
          // 添加欢迎消息
          setMessages([{
            role: 'assistant',
            content: `您好！我已收到您上传的 **${uploadData.totalRows}** 条用户数据。\n\n我可以帮您：\n1. 分析人群特征和分布\n2. 识别潜在问题和机会\n3. 生成针对性的运营策略\n\n请问您想从哪方面开始分析？`,
            timestamp: Date.now()
          }]);
        }
      } catch (error) {
        console.error('创建会话失败:', error);
      }
    };

    if (uploadData) {
      createSession();
    }
  }, [uploadData]);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: Date.now() }]);

    try {
      // 使用 SSE 流式接收
      const eventSource = new EventSource(`/api/chat/stream?sessionId=${sessionId}&message=${encodeURIComponent(userMessage)}`);
      
      let assistantMessage = '';
      const messageId = Date.now();

      // 先添加一个空的助手消息
      setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: messageId, streaming: true }]);

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
            role: 'system', 
            content: '抱歉，处理出错，请重试。', 
            timestamp: Date.now() 
          }]);
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

  const generateStrategy = async () => {
    if (!sessionId || generatingStrategy) return;
    
    setGeneratingStrategy(true);
    
    try {
      const strategy = await chatApi.generateStrategy(sessionId);
      
      if (strategy) {
        // 添加策略消息
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: strategy.type === 'structured' 
            ? `## 🎯 ${strategy.data?.策略名称 || strategy.data?.strategy_name || '运营策略'}\n\n${JSON.stringify(strategy.data, null, 2)}`
            : strategy.data,
          timestamp: Date.now(),
          isStrategy: true,
          strategyData: strategy
        }]);

        onStrategyGenerated?.(strategy);
      }
    } catch (error) {
      console.error('生成策略失败:', error);
    } finally {
      setGeneratingStrategy(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    '分析这个人群的特点',
    '找出高价值用户',
    '有什么流失风险吗？',
    '生成一个召回策略'
  ];

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <div className="chat-title">
          <Bot size={20} />
          <span>AI 策略助手</span>
        </div>
        <button 
          className="strategy-btn"
          onClick={generateStrategy}
          disabled={generatingStrategy}
        >
          {generatingStrategy ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
          生成策略
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role} ${msg.isStrategy ? 'strategy' : ''}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="message-content">
              <div className="message-text" dangerouslySetInnerHTML={{ 
                __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') 
              }} />
              {msg.streaming && <span className="typing">▊</span>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="quick-prompts">
        {quickPrompts.map((prompt, i) => (
          <button 
            key={i} 
            className="quick-prompt"
            onClick={() => { setInput(prompt); }}
          >
            <Lightbulb size={12} />
            {prompt}
          </button>
        ))}
      </div>

      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，询问关于数据的分析或策略建议..."
            rows={1}
            disabled={loading}
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

export default AIChat;
