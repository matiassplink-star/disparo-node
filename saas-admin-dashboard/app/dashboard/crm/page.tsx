'use client'

// ⚠️ Este arquivo usa useRef para evitar dupla criação de colunas em dev (React StrictMode)

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabaseClient } from '@/lib/supabase'
import ChatWindow from '@/components/crm/ChatWindow'
import KanbanBoard from '@/components/crm/KanbanBoard'
import { MessageSquare, LayoutDashboard, Search, RefreshCw } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────

interface Chat {
  id: string
  remote_jid: string
  name: string
  chat_status: string
  lastMessage: { content: string; created_at: string; from_me: boolean } | null
  updated_at: string
  tags: string[]
}

interface KanbanCard {
  id: string
  column_id: string
  contact_name: string
  contact_phone: string
  notes?: string
  value?: number
  position: number
}

interface KanbanColumn {
  id: string
  title: string
  color: string
  position: number
  cards: KanbanCard[]
}

// ─── Default Kanban Columns ───────────────────────────────────────

const DEFAULT_COLUMNS = [
  { title: 'Novo Lead', color: '#3b82f6' },
  { title: 'Em Atendimento', color: '#f59e0b' },
  { title: 'Proposta Enviada', color: '#06b6d4' },
  { title: 'Fechado ✓', color: '#22c55e' },
]

// ─── Chat List Item ───────────────────────────────────────────────

function ChatItem({ chat, active, onClick }: { chat: Chat; active: boolean; onClick: () => void }) {
  const time = chat.updated_at
    ? new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  const statusColor: Record<string, string> = {
    open: 'bg-emerald-500',
    paused_ai: 'bg-amber-500',
    closed: 'bg-slate-500',
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-[#1e2028] transition-all group ${
        active
          ? 'bg-[#1c2333] border-l-2 border-l-[#3b82f6]'
          : 'hover:bg-[#13161b] border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e2028] to-[#2a2d34] border border-[#2a2d34] flex items-center justify-center text-base font-bold text-white">
            {chat.name.charAt(0).toUpperCase()}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d0f12] ${statusColor[chat.chat_status] || 'bg-slate-500'}`}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0.5">
            <span className="text-sm font-semibold text-white truncate pr-2">{chat.name}</span>
            <span className="text-[10px] text-[#64748b] shrink-0">{time}</span>
          </div>
          <p className="text-[12px] text-[#64748b] truncate">
            {chat.lastMessage
              ? `${chat.lastMessage.from_me ? 'Você: ' : ''}${chat.lastMessage.content || '📎 Mídia'}`
              : 'Nenhuma mensagem'}
          </p>
          {chat.tags?.length > 0 && (
            <div className="flex gap-1 mt-1.5 overflow-x-hidden">
              {chat.tags.slice(0, 3).map((tag: string) => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#3b82f6]/15 text-[#3b82f6] font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Main CRM Page ────────────────────────────────────────────────

export default function CRMPage() {
  const [view, setView] = useState<'chat' | 'kanban'>('chat')
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [search, setSearch] = useState('')
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [isLoadingKanban, setIsLoadingKanban] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatPhone, setNewChatPhone] = useState('')
  const [newChatName, setNewChatName] = useState('')
  const [isSendingNew, setIsSendingNew] = useState(false)
  // Guard contra dupla execução em dev (React StrictMode)
  const isCreatingColumns = useRef(false)

  const supabase = supabaseClient

  // ─── Fetch Chats ───────────────────────────────────────────────

  const fetchChats = useCallback(async () => {
    setIsLoadingChats(true)
    try {
      const res = await fetch('/api/whatsapp/chats')
      if (res.ok) setChats(await res.json())
    } finally {
      setIsLoadingChats(false)
    }
  }, [])

  // ─── Fetch Kanban ──────────────────────────────────────────────

  const fetchKanban = useCallback(async () => {
    setIsLoadingKanban(true)
    try {
      const res = await fetch('/api/crm/columns')
      if (res.ok) {
        const data = await res.json()
        if (data.length === 0) {
          // Evita criar colunas duplicadas (React StrictMode roda 2x em dev)
          if (isCreatingColumns.current) return
          isCreatingColumns.current = true
          for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
            await fetch('/api/crm/columns', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(DEFAULT_COLUMNS[i]),
            })
          }
          const res2 = await fetch('/api/crm/columns')
          if (res2.ok) setColumns(await res2.json())
          isCreatingColumns.current = false
        } else {
          setColumns(data)
        }
      }
    } finally {
      setIsLoadingKanban(false)
    }
  }, [])

  useEffect(() => {
    fetchChats()
    fetchKanban()
  }, [fetchChats, fetchKanban])

  // ─── Realtime: novas mensagens atualizam a lista de chats (com debounce) ────

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel('crm_new_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          // Debounce de 2s — evita 5000 chamadas durante Deep Sync
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => fetchChats(), 2000)
        }
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchChats])

  // ─── Kanban Actions ────────────────────────────────────────────

  const handleMoveCard = async (cardId: string, toColumnId: string, toPosition: number) => {
    // Optimistic update
    setColumns(prev => {
      const next = prev.map(col => ({
        ...col,
        cards: col.cards.filter(c => c.id !== cardId),
      }))
      const card = prev.flatMap(c => c.cards).find(c => c.id === cardId)
      if (!card) return prev
      const updatedCard = { ...card, column_id: toColumnId, position: toPosition }
      return next.map(col =>
        col.id === toColumnId
          ? {
              ...col,
              cards: [
                ...col.cards.slice(0, toPosition),
                updatedCard,
                ...col.cards.slice(toPosition),
              ],
            }
          : col
      )
    })

    await fetch('/api/crm/cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cardId, column_id: toColumnId, position: toPosition }),
    })
  }

  const handleDeleteCard = async (cardId: string) => {
    setColumns(prev =>
      prev.map(col => ({ ...col, cards: col.cards.filter(c => c.id !== cardId) }))
    )
    await fetch(`/api/crm/cards?id=${cardId}`, { method: 'DELETE' })
  }

  const handleAddCard = async (columnId: string, phone: string, name: string) => {
    const res = await fetch('/api/crm/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_id: columnId, contact_phone: phone, contact_name: name }),
    })
    if (res.ok) {
      const newCard = await res.json()
      setColumns(prev =>
        prev.map(col =>
          col.id === columnId ? { ...col, cards: [...col.cards, newCard] } : col
        )
      )
    }
  }

  const handleOpenChatFromKanban = (phone: string, name: string) => {
    setView('chat')
    const existing = chats.find(c => c.remote_jid === phone)
    if (existing) {
      setActiveChat(existing)
    } else {
      // Chat sintético para número sem histórico
      setActiveChat({
        id: `kanban-${phone}`,
        remote_jid: phone,
        name,
        chat_status: 'open',
        lastMessage: null,
        updated_at: new Date().toISOString(),
        tags: [],
      })
    }
  }

  // ─── Iniciar Nova Conversa ─────────────────────────────────────

  const handleStartNewChat = async () => {
    if (!newChatPhone.trim()) return
    setIsSendingNew(true)
    const phone = newChatPhone.replace(/\D/g, '') // só números
    const name = newChatName.trim() || phone
    try {
      // Abre o chat diretamente (o envio de msg acontece na ChatWindow)
      const syntheticChat: Chat = {
        id: `new-${phone}`,
        remote_jid: phone,
        name,
        chat_status: 'open',
        lastMessage: null,
        updated_at: new Date().toISOString(),
        tags: [],
      }
      setActiveChat(syntheticChat)
      setView('chat')
      setShowNewChat(false)
      setNewChatPhone('')
      setNewChatName('')
    } finally {
      setIsSendingNew(false)
    }
  }

  // ─── Filtered Chats ────────────────────────────────────────────

  const filteredChats = chats.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.remote_jid.includes(search)
  )

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-[#0d0f12]">

      {/* ── PAINEL ESQUERDO ── */}
      <div
        className={`flex flex-col border-r border-[#1e2028] transition-all duration-300 ${
          view === 'kanban' ? 'w-0 overflow-hidden' : 'w-80 lg:w-[340px] shrink-0'
        }`}
      >
        {/* Tabs */}
        <div className="flex items-center gap-1 p-3 border-b border-[#1e2028] bg-[#0d0f12]">
          <button
            onClick={() => setView('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'chat'
                ? 'bg-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/20'
                : 'text-[#64748b] hover:text-white hover:bg-[#1e2028]'
            }`}
          >
            <MessageSquare size={13} />
            Chat
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'kanban'
                ? 'bg-[#f59e0b] text-[#0d0f12] shadow-lg shadow-[#f59e0b]/20'
                : 'text-[#64748b] hover:text-white hover:bg-[#1e2028]'
            }`}
          >
            <LayoutDashboard size={13} />
            Kanban
          </button>
          <div className="ml-auto flex gap-1">
            {/* Botão Nova Conversa */}
            <button
              onClick={() => setShowNewChat(true)}
              title="Iniciar nova conversa"
              className="p-1.5 rounded-lg text-[#22c55e] hover:text-white hover:bg-[#22c55e]/20 transition-colors flex items-center gap-1 text-xs px-2 font-semibold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Novo</span>
            </button>
            <button
              onClick={async () => {
                if (!confirm('A Sincronização Profunda vai buscar o histórico de até 50 chats e 100 mensagens por chat. Pode levar até 1 minuto. Deseja continuar?')) return
                setIsLoadingChats(true)
                try {
                  const res = await fetch('/api/whatsapp/sync-deep', { method: 'POST' })
                  if (res.ok) {
                    const data = await res.json()
                    alert(data.message)
                  } else {
                    alert('Erro ao sincronizar profundo.')
                  }
                } finally {
                  fetchChats()
                }
              }}
              title="Sincronização Profunda (Histórico Completo)"
              className="p-1.5 rounded-lg text-[#f59e0b] hover:text-white hover:bg-[#f59e0b]/20 transition-colors flex items-center gap-1 text-xs px-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>Deep Sync</span>
            </button>
            <button
              onClick={async () => {
                setIsLoadingChats(true)
                try {
                  const res = await fetch('/api/whatsapp/sync', { method: 'POST' })
                  if (res.ok) {
                    const data = await res.json()
                    alert(data.message)
                  } else {
                    alert('Erro ao sincronizar conversas.')
                  }
                } finally {
                  fetchChats()
                }
              }}
              title="Sincronização Rápida (Mensagens Recentes)"
              className="p-1.5 rounded-lg text-[#3b82f6] hover:text-white hover:bg-[#3b82f6]/20 transition-colors flex items-center gap-1 text-xs px-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="m8 17 4 4 4-4"></path></svg>
              <span>Sync</span>
            </button>
            <button
              onClick={fetchChats}
              title="Atualizar UI"
              className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#1e2028] transition-colors"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Modal Nova Conversa */}
        {showNewChat && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#13161b] border border-[#2a2d34] rounded-2xl p-6 w-80 shadow-2xl">
              <h3 className="text-white font-bold text-base mb-4">💬 Nova Conversa</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[#64748b] text-xs mb-1 block">Número (com DDI)</label>
                  <input
                    type="tel"
                    value={newChatPhone}
                    onChange={e => setNewChatPhone(e.target.value)}
                    placeholder="5534999001234"
                    className="w-full bg-[#1e2028] border border-[#2a2d34] rounded-lg px-3 py-2 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#22c55e]"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleStartNewChat()}
                  />
                </div>
                <div>
                  <label className="text-[#64748b] text-xs mb-1 block">Nome (opcional)</label>
                  <input
                    type="text"
                    value={newChatName}
                    onChange={e => setNewChatName(e.target.value)}
                    placeholder="Nome do contato"
                    className="w-full bg-[#1e2028] border border-[#2a2d34] rounded-lg px-3 py-2 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#22c55e]"
                    onKeyDown={e => e.key === 'Enter' && handleStartNewChat()}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setShowNewChat(false); setNewChatPhone(''); setNewChatName('') }}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#1e2028] text-[#64748b] text-sm hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleStartNewChat}
                    disabled={!newChatPhone.trim() || isSendingNew}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#22c55e] text-white text-sm font-semibold hover:bg-[#16a34a] transition-colors disabled:opacity-50"
                  >
                    Abrir Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-3 py-2 border-b border-[#1e2028]">
          <div className="flex items-center gap-2 bg-[#13161b] border border-[#2a2d34] rounded-lg px-3 py-2">
            <Search size={13} className="text-[#64748b] shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="bg-transparent text-xs text-white placeholder-[#64748b] focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingChats ? (
            <div className="flex items-center justify-center h-32 text-[#64748b] text-xs">
              Carregando...
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#64748b] text-xs text-center px-6">
              <MessageSquare size={32} className="mb-3 opacity-20" />
              {search ? 'Nenhum resultado.' : 'Nenhuma conversa aberta.\nAs mensagens aparecerão aqui automaticamente.'}
            </div>
          ) : (
            filteredChats.map(chat => (
              <ChatItem
                key={chat.id}
                chat={chat}
                active={activeChat?.id === chat.id}
                onClick={() => setActiveChat(chat)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── PAINEL DIREITO: Chat ou Kanban ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === 'chat' ? (
          activeChat ? (
            <ChatWindow activeChat={activeChat} />
          ) : (
            <div className="flex flex-col h-full items-center justify-center text-[#64748b]">
              <div className="text-6xl mb-6 opacity-10">💬</div>
              <h2 className="text-xl font-bold text-white mb-2">ZapLink CRM</h2>
              <p className="text-sm">Selecione uma conversa para começar.</p>
            </div>
          )
        ) : (
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Pipeline de Vendas</h2>
                <p className="text-xs text-[#64748b] mt-1">
                  {columns.reduce((acc, col) => acc + col.cards.length, 0)} leads no funil
                </p>
              </div>
              <button
                onClick={() => setView('chat')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#64748b] hover:text-white hover:bg-[#1e2028] transition-colors border border-[#2a2d34]"
              >
                <MessageSquare size={13} />
                Voltar ao Chat
              </button>
            </div>

            {isLoadingKanban ? (
              <div className="flex items-center justify-center h-40 text-[#64748b] text-xs">
                Carregando Kanban...
              </div>
            ) : (
              <KanbanBoard
                columns={columns}
                onMoveCard={handleMoveCard}
                onDeleteCard={handleDeleteCard}
                onAddCard={handleAddCard}
                onOpenChat={handleOpenChatFromKanban}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
