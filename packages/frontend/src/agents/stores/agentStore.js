import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 创建 Agent 工作区状态
const createAgentWorkspace = (agentId) => ({
  agentId,
  isActive: false,
  tabs: [],
  activeTabId: null,
  // 对话历史 - 关键：每个 Agent 独立的对话记录
  conversations: [],
  // 输入框内容
  inputText: '',
  // 文件上传
  uploadedFiles: [],
  // UI 状态
  sidebarOpen: true,
  rightPanelOpen: true,
  // Memory 面板状态
  memory: {
    shortTerm: [],
    mediumTerm: [],
    longTerm: {},
    searchQuery: ''
  },
  // Skills 面板状态
  skills: {
    recent: [],
    favorites: [],
    searchQuery: ''
  },
  // 截图相关
  screenshots: [],
  screenshotMode: false
})

export const useAgentStore = create(
  persist(
    (set, get) => ({
      // ============ 全局状态 ============
      activeAgentId: null,
      workspaces: {},
      globalPanelOpen: true,
      
      // ============ 工作区管理 ============
      
      // 初始化 Agent 工作区
      initWorkspace: (agentId) => {
        const state = get()
        if (!state.workspaces[agentId]) {
          set({
            workspaces: {
              ...state.workspaces,
              [agentId]: createAgentWorkspace(agentId)
            }
          })
        }
      },
      
      // 切换当前 Agent
      switchAgent: (agentId) => {
        const state = get()
        // 确保目标工作区存在
        if (!state.workspaces[agentId]) {
          get().initWorkspace(agentId)
        }
        set({ activeAgentId: agentId })
      },
      
      // ============ 对话历史管理 ============
      
      // 添加消息到当前 Agent 的对话历史
      addMessage: (agentId, message) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        // 如果消息已有 id，则保留，否则生成新 id
        const messageId = message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              conversations: [...workspace.conversations, {
                ...message,
                id: messageId,
                timestamp: message.timestamp || Date.now()
              }]
            }
          }
        }
      }),
      
      // 更新消息（用于流式响应）
      updateMessage: (agentId, messageId, updates) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              conversations: workspace.conversations.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              )
            }
          }
        }
      }),
      
      // 清空对话历史
      clearConversation: (agentId) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              conversations: []
            }
          }
        }
      }),
      
      // 获取当前 Agent 的对话历史
      getConversationHistory: (agentId) => {
        const state = get()
        return state.workspaces[agentId]?.conversations || []
      },
      
      // ============ 输入框管理 ============
      
      setInputText: (agentId, text) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: { ...workspace, inputText: text }
          }
        }
      }),
      
      // ============ 文件上传管理 ============
      
      addUploadedFile: (agentId, file) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              uploadedFiles: [...workspace.uploadedFiles, file]
            }
          }
        }
      }),
      
      removeUploadedFile: (agentId, fileId) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              uploadedFiles: workspace.uploadedFiles.filter(f => f.id !== fileId)
            }
          }
        }
      }),
      
      clearUploadedFiles: (agentId) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: { ...workspace, uploadedFiles: [] }
          }
        }
      }),
      
      // ============ Memory 面板管理 ============
      
      setMemorySearchQuery: (agentId, query) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              memory: { ...workspace.memory, searchQuery: query }
            }
          }
        }
      }),
      
      addShortTermMemory: (agentId, memory) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              memory: {
                ...workspace.memory,
                shortTerm: [memory, ...workspace.memory.shortTerm].slice(0, 50)
              }
            }
          }
        }
      }),
      
      // ============ Skills 面板管理 ============
      
      setSkillsSearchQuery: (agentId, query) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              skills: { ...workspace.skills, searchQuery: query }
            }
          }
        }
      }),
      
      toggleSkillFavorite: (agentId, skillId) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        const favorites = workspace.skills.favorites.includes(skillId)
          ? workspace.skills.favorites.filter(id => id !== skillId)
          : [...workspace.skills.favorites, skillId]
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              skills: { ...workspace.skills, favorites }
            }
          }
        }
      }),
      
      addRecentSkill: (agentId, skillId) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        const recent = [skillId, ...workspace.skills.recent.filter(id => id !== skillId)].slice(0, 5)
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              skills: { ...workspace.skills, recent }
            }
          }
        }
      }),
      
      // ============ 截图功能 ============
      
      addScreenshot: (agentId, screenshotData) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        const screenshot = {
          id: `screenshot_${Date.now()}`,
          data: screenshotData,
          timestamp: Date.now()
        }
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              screenshots: [...workspace.screenshots, screenshot]
            }
          }
        }
      }),
      
      removeScreenshot: (agentId, screenshotId) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              screenshots: workspace.screenshots.filter(s => s.id !== screenshotId)
            }
          }
        }
      }),
      
      setScreenshotMode: (agentId, enabled) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: { ...workspace, screenshotMode: enabled }
          }
        }
      }),
      
      // ============ 面板开关 ============
      
      toggleSidebar: (agentId) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: { ...workspace, sidebarOpen: !workspace.sidebarOpen }
          }
        }
      }),
      
      toggleRightPanel: (agentId) => set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: { ...workspace, rightPanelOpen: !workspace.rightPanelOpen }
          }
        }
      }),
      
      toggleGlobalPanel: () => set((state) => ({
        globalPanelOpen: !state.globalPanelOpen
      })),
      
      // ============ 导入导出 ============
      
      exportWorkspaceData: (agentId) => {
        const state = get()
        return state.workspaces[agentId] || null
      },
      
      importWorkspaceData: (agentId, data) => set((state) => ({
        workspaces: {
          ...state.workspaces,
          [agentId]: { ...data, agentId }
        }
      }))
    }),
    {
      name: 'agent-workspace-v3',
      version: 4,
      migrate: (persistedState, version) => {
        if (version < 4) {
          // 版本4：统一 agent ID 格式为下划线
          return { activeAgentId: null, workspaces: {}, globalPanelOpen: true }
        }
        return persistedState
      },
      partialize: (state) => ({
        activeAgentId: state.activeAgentId,
        workspaces: state.workspaces,
        globalPanelOpen: state.globalPanelOpen
      })
    }
  )
)

export default useAgentStore
