/**
 * Chat Store - 全局聊天状态管理
 * 管理会话、消息、Skill 状态
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 消息类型定义
const createMessage = (data) => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  timestamp: Date.now(),
  ...data
});

// Session 工厂
const createSession = (id = null) => ({
  id: id || `session_${Date.now()}`,
  title: '新会话',
  messages: [],
  files: [],
  activeSkill: null,
  createdAt: Date.now(),
  updatedAt: Date.now()
});

export const useChatStore = create(
  persist(
    (set, get) => ({
      // 状态
      sessions: [],
      currentSessionId: null,
      isLoading: false,
      streamingMessageId: null,
      skills: [],
      activeFiles: [],
      _hasHydrated: false, // 标记是否已从 localStorage 恢复

      // 获取当前会话
      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        return sessions.find(s => s.id === currentSessionId) || null;
      },

      // 创建新会话
      createSession: () => {
        const newSession = createSession();
        set(state => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id
        }));
        return newSession.id;
      },

      // 切换会话
      switchSession: (sessionId) => {
        set({ currentSessionId: sessionId });
      },

      // 删除会话
      deleteSession: (sessionId) => {
        set(state => {
          const newSessions = state.sessions.filter(s => s.id !== sessionId);
          let newCurrentId = state.currentSessionId;
          
          if (state.currentSessionId === sessionId) {
            newCurrentId = newSessions[0]?.id || null;
          }
          
          return {
            sessions: newSessions,
            currentSessionId: newCurrentId
          };
        });
      },

      // 添加消息
      addMessage: (sessionId, messageData) => {
        const message = createMessage(messageData);
        
        set(state => ({
          sessions: state.sessions.map(session => {
            if (session.id !== sessionId) return session;
            
            const newMessages = [...session.messages, message];
            
            // 自动生成标题（第一条用户消息后）
            let newTitle = session.title;
            if (session.title === '新会话' && messageData.role === 'user') {
              newTitle = messageData.content.slice(0, 20) + (messageData.content.length > 20 ? '...' : '');
            }
            
            return {
              ...session,
              title: newTitle,
              messages: newMessages,
              updatedAt: Date.now()
            };
          })
        }));
        
        return message.id;
      },

      // 更新消息
      updateMessage: (sessionId, messageId, updates) => {
        set(state => ({
          sessions: state.sessions.map(session => {
            if (session.id !== sessionId) return session;
            
            return {
              ...session,
              messages: session.messages.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
              updatedAt: Date.now()
            };
          })
        }));
      },

      // 添加文件
      addFile: (sessionId, fileInfo) => {
        set(state => ({
          sessions: state.sessions.map(session => {
            if (session.id !== sessionId) return session;
            
            return {
              ...session,
              files: [...session.files, fileInfo],
              updatedAt: Date.now()
            };
          }),
          activeFiles: [...get().activeFiles, fileInfo]
        }));
      },

      // 设置 Skill
      setActiveSkill: (sessionId, skillId) => {
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, activeSkill: skillId }
              : session
          )
        }));
      },

      // 设置加载状态
      setLoading: (loading) => set({ isLoading: loading }),
      setStreamingMessageId: (id) => set({ streamingMessageId: id }),

      // 设置 Skills 列表
      setSkills: (skills) => set({ skills }),

      // 设置 hydrated 状态
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // 清空当前会话
      clearCurrentSession: () => {
        const { currentSessionId } = get();
        if (currentSessionId) {
          set(state => ({
            sessions: state.sessions.map(session =>
              session.id === currentSessionId
                ? { ...session, messages: [], files: [], title: '新会话' }
                : session
            )
          }));
        }
      }
    }),
    {
      name: 'strategy-ai-chat',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId
      }),
      onRehydrateStorage: (state) => {
        // 恢复完成后设置标记
        return () => {
          state?.setHasHydrated(true);
        };
      }
    }
  )
);
