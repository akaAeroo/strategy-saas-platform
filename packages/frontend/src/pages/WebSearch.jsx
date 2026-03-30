import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Globe, 
  Link, 
  Loader2, 
  ExternalLink, 
  FileText, 
  Bot,
  Send,
  Sparkles,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { webSearchApi } from '../services/api';
import './WebSearch.css';

/**
 * Web Search 页面
 * 网页抓取和全网搜索
 */
const WebSearch = () => {
  const [activeTab, setActiveTab] = useState('search'); // search, fetch
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [searchStatus, setSearchStatus] = useState(null);
  
  const messagesEndRef = useRef(null);

  // 检查搜索服务状态
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await webSearchApi.getStatus();
      setSearchStatus(status);
    } catch (error) {
      console.error('检查状态失败:', error);
    }
  };

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 执行搜索
  const handleSearch = async () => {
    if (!query.trim() || loading) return;

    const searchQuery = query.trim();
    setLoading(true);
    
    // 添加用户消息
    setMessages(prev => [...prev, {
      role: 'user',
      content: `🔍 搜索: "${searchQuery}"`,
      timestamp: Date.now()
    }]);

    try {
      // 使用流式分析
      const eventSource = new EventSource(
        webSearchApi.getStreamAnalyzeUrl(searchQuery)
      );

      let assistantMessage = '';
      const messageId = Date.now();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: messageId,
        streaming: true,
        isSearch: true,
        query: searchQuery
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
          // 如果搜索 API 未配置，显示友好提示
          if (data.data.includes('未配置')) {
            setMessages(prev => [...prev, {
              role: 'system',
              content: `⚠️ **搜索服务未配置**\n\n如需启用全网搜索功能，请配置以下环境变量之一：\n\n1. **Bing Search API**\n   - 注册: https://azure.microsoft.com/services/cognitive-services/bing-web-search-api/\n   - 设置: \`BING_SEARCH_KEY=your_key\`\n\n2. **SerpAPI (Google)**\n   - 注册: https://serpapi.com/\n   - 设置: \`SERPAPI_KEY=your_key\`\n\n当前仍可使用 **网页抓取** 功能分析特定 URL。`,
              timestamp: Date.now()
            }]);
          }
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setLoading(false);
      };

    } catch (error) {
      console.error('搜索失败:', error);
      setLoading(false);
    }
  };

  // 抓取并分析 URL
  const handleFetchUrl = async () => {
    if (!url.trim() || loading) return;

    let targetUrl = url.trim();
    // 自动补全 http://
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    setLoading(true);

    // 添加用户消息
    setMessages(prev => [...prev, {
      role: 'user',
      content: `🔗 抓取: ${targetUrl}`,
      timestamp: Date.now()
    }]);

    try {
      const eventSource = new EventSource(
        webSearchApi.analyzeUrl(targetUrl)
      );

      let assistantMessage = '';
      const messageId = Date.now();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: messageId,
        streaming: true,
        isFetch: true,
        url: targetUrl
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
          setMessages(prev => prev.map(msg =>
            msg.timestamp === messageId
              ? { ...msg, content: '❌ 抓取失败: ' + data.data, streaming: false }
              : msg
          ));
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setLoading(false);
      };

    } catch (error) {
      console.error('抓取失败:', error);
      setLoading(false);
    }
  };

  // 追问
  const handleAskFollowUp = async (question) => {
    if (!question.trim() || loading) return;

    setLoading(true);

    // 添加用户消息
    setMessages(prev => [...prev, {
      role: 'user',
      content: question,
      timestamp: Date.now()
    }]);

    // 找到最近的搜索结果
    const lastSearch = [...messages].reverse().find(m => m.isSearch || m.isFetch);
    const queryToUse = lastSearch?.query || lastSearch?.url || 'general';

    try {
      const eventSource = new EventSource(
        webSearchApi.getStreamAnalyzeUrl(queryToUse, question)
      );

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
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setLoading(false);
      };

    } catch (error) {
      console.error('追问失败:', error);
      setLoading(false);
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
    setQuery('');
    setUrl('');
  };

  // 渲染 Markdown 内容
  const renderContent = (content) => {
    if (!content) return null;
    
    let html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[\^(\d+)\^\]/g, '<sup>[$1]</sup>')
      .replace(/\n/g, '<br>');
    
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // 快捷问题
  const quickQuestions = [
    '总结主要内容',
    '提取关键数据',
    '有什么重要发现？',
    '分析优缺点'
  ];

  return (
    <div className="web-search-page">
      {/* 头部 */}
      <div className="web-search-header">
        <h1>🌐 Web Search</h1>
        <p>全网搜索与网页抓取，AI 实时分析网络信息</p>
        
        {searchStatus && (
          <div className="status-badge">
            {searchStatus.available ? (
              <><CheckCircle size={14} /> 搜索服务正常</>
            ) : (
              <><AlertCircle size={14} /> 搜索 API 未配置（仅网页抓取可用）</>
            )}
          </div>
        )}
      </div>

      {/* 标签切换 */}
      <div className="search-tabs">
        <button 
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={16} />
          全网搜索
        </button>
        <button 
          className={`tab ${activeTab === 'fetch' ? 'active' : ''}`}
          onClick={() => setActiveTab('fetch')}
        >
          <Link size={16} />
          网页抓取
        </button>
      </div>

      {/* 输入区域 */}
      <div className="search-input-area">
        {activeTab === 'search' ? (
          <div className="search-box">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入搜索关键词，如：2024电商行业趋势、竞品分析报告..."
              disabled={loading}
            />
            <button 
              className="search-btn"
              onClick={handleSearch}
              disabled={!query.trim() || loading}
            >
              {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
              {loading ? '搜索中...' : 'AI 搜索'}
            </button>
          </div>
        ) : (
          <div className="fetch-box">
            <Globe size={20} className="fetch-icon" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
              placeholder="输入网址，如：example.com 或 https://example.com/article"
              disabled={loading}
            />
            <button 
              className="fetch-btn"
              onClick={handleFetchUrl}
              disabled={!url.trim() || loading}
            >
              {loading ? <Loader2 className="spin" size={18} /> : <FileText size={18} />}
              {loading ? '抓取中...' : '抓取分析'}
            </button>
          </div>
        )}
      </div>

      {/* 快捷问题 */}
      {messages.length > 0 && (
        <div className="quick-questions">
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              className="quick-q-btn"
              onClick={() => handleAskFollowUp(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 消息列表 */}
      <div className="search-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌐</div>
            <h3>开始探索网络信息</h3>
            <p>输入关键词进行全网搜索，或输入 URL 抓取特定网页</p>
            
            <div className="example-box">
              <h4>💡 使用示例</h4>
              <ul>
                <li>搜索："2024年私域运营趋势报告"</li>
                <li>搜索："瑞幸咖啡营销策略分析"</li>
                <li>抓取：https://www.example.com/news/article</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`search-message ${msg.role} ${msg.isSearch ? 'search' : ''} ${msg.isFetch ? 'fetch' : ''}`}
              >
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : msg.role === 'system' ? '⚠️' : '🤖'}
                </div>
                <div className="message-body">
                  {msg.isFetch && msg.url && (
                    <div className="url-badge">
                      <ExternalLink size={12} />
                      <a href={msg.url} target="_blank" rel="noopener noreferrer">
                        {msg.url}
                      </a>
                    </div>
                  )}
                  <div className="message-content">
                    {renderContent(msg.content)}
                  </div>
                  {msg.streaming && <span className="typing">▊</span>}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 底部操作栏 */}
      {messages.length > 0 && (
        <div className="search-footer">
          <button className="clear-btn" onClick={handleClear}>
            <RefreshCw size={14} />
            清空对话
          </button>
          
          {/* 追问输入 */}
          <div className="follow-up-input">
            <input
              type="text"
              placeholder="继续追问..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAskFollowUp(e.target.value);
                  e.target.value = '';
                }
              }}
              disabled={loading}
            />
            <Send size={16} />
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSearch;
