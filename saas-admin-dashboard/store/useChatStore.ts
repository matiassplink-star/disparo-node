import { create } from 'zustand'

export interface Message {
  id: string
  external_id?: string
  content: string
  from_me: boolean
  created_at: string
  status?: string
  message_type?: string
  media_url?: string
}

interface ChatStore {
  // Estado
  messagesByChat: Record<string, Message[]>
  activeChatId: string | null

  // Ações
  setActiveChat: (id: string | null) => void
  setMessages: (chatId: string, messages: Message[]) => void
  addMessage: (chatId: string, message: Message) => void
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void
  removeMessage: (chatId: string, messageId: string) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messagesByChat: {},
  activeChatId: null,

  setActiveChat: (id) => set({ activeChatId: id }),

  setMessages: (chatId, messages) => {
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      },
    }))
  },

  addMessage: (chatId, msg) => {
    set((state) => {
      const list = state.messagesByChat[chatId] || []
      const key = msg.external_id || msg.id

      // Verifica se a mensagem já existe no estado (mesma lógica de merge manual que usávamos antes)
      const existingIdx = list.findIndex(m => (m.external_id || m.id) === key)
      
      let newList = [...list]

      if (existingIdx === -1) {
        newList.push(msg)
      } else {
        const existing = list[existingIdx]
        // Atualiza a existente apenas se a nova for mais recente ou se for a troca de uma optimística
        if (
          String(existing.id).startsWith('opt-') ||
          new Date(msg.created_at) >= new Date(existing.created_at)
        ) {
          newList[existingIdx] = { ...existing, ...msg }
        }
      }

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: newList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        },
      }
    })
  },

  updateMessage: (chatId, messageId, updates) => {
    set((state) => {
      const list = state.messagesByChat[chatId] || []
      const newList = list.map(m => (m.id === messageId || m.external_id === messageId) ? { ...m, ...updates } : m)
      
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: newList,
        },
      }
    })
  },

  removeMessage: (chatId, messageId) => {
    set((state) => {
      const list = state.messagesByChat[chatId] || []
      const newList = list.filter(m => m.id !== messageId && m.external_id !== messageId)
      
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: newList,
        },
      }
    })
  }
}))
