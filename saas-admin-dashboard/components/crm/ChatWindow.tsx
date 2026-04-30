'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import MessageBubble from './MessageBubble'
import { 
  User, 
  Mic, 
  Paperclip, 
  Send, 
  Calendar, 
  UserPlus, 
  ArrowRightLeft, 
  Bot, 
  CheckCircle2,
  Trash2,
} from 'lucide-react'

import { useChatStore, Message } from '@/store/useChatStore'
import { supabaseClient } from '@/lib/supabase'

// Helper para formatar número
function formatPhoneAsName(name: string): string {
  if (/^\d+$/.test(name)) {
    if (name.startsWith('55') && name.length >= 12) {
      return `+55 (${name.substring(2, 4)}) ${name.substring(4, 9)}-${name.substring(9)}`
    }
    return `+${name}`
  }
  return name
}

interface ActiveChat {
  id?: string
  remote_jid: string
  name: string
  ai_active?: boolean
  chat_status?: string
  lastMessage?: { content: string; created_at: string; from_me: boolean } | null
  updated_at?: string
  tags?: string[]
}

function cleanJid(jid: string): string {
  return jid
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace('@lid', '')
}

export default function ChatWindow({ activeChat }: { activeChat: ActiveChat }) {
  const messages = useChatStore(state => state.messagesByChat[activeChat.remote_jid] || [])
  const setMessages = useChatStore(state => state.setMessages)
  const addMessage = useChatStore(state => state.addMessage)
  const updateMessage = useChatStore(state => state.updateMessage)

  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isAiActive, setIsAiActive] = useState(activeChat.ai_active !== false)
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // JID limpo para queries e filtros Realtime (exact-match no banco)
  const cleanRemoteJid = activeChat.remote_jid
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace('@lid', '')

  const fetchMessages = useCallback(async () => {
    if (!activeChat?.remote_jid) return
    setIsLoadingMessages(true)
    try {
      const res = await fetch(`/api/whatsapp/messages?remote_jid=${encodeURIComponent(cleanRemoteJid)}&limit=200`, {
        cache: 'no-store'
      })
      if (!res.ok) return
      const data = await res.json() as Message[]
      setMessages(activeChat.remote_jid, data)
    } catch {
      // Falha no fetch silenciada
    } finally {
      setIsLoadingMessages(false)
    }
  }, [activeChat?.remote_jid, cleanRemoteJid, setMessages])

  // Realtime puro + Fetch Inicial
  useEffect(() => {
    if (!activeChat?.remote_jid) return

    // 1. Puxa o histórico inicial
    fetchMessages()

    // 2. Conecta no Realtime nativo do Supabase
    // CRÍTICO: o filtro é exact-match — usa o JID sem sufixo (@s.whatsapp.net etc.)
    const channel = supabaseClient
      .channel(`chat_${cleanRemoteJid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `remote_jid=eq.${cleanRemoteJid}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addMessage(activeChat.remote_jid, payload.new as Message)
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Message
            updateMessage(activeChat.remote_jid, updated.external_id || updated.id, updated)
          }
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [activeChat?.remote_jid, cleanRemoteJid, fetchMessages, addMessage, updateMessage])

  // Auto-scroll sem usar scrollIntoView (para não scrollar o layout main acidentalmente)
  useEffect(() => {
    if (messagesContainerRef.current) {
      const el = messagesContainerRef.current
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending || !activeChat?.remote_jid) return

    const textToSend = inputText
    setInputText('')
    setIsSending(true)

    const optId = `opt-${Date.now()}`
    const optimisticMsg: Message = {
      id: optId,
      external_id: optId, // Força a chave
      content: textToSend,
      from_me: true,
      created_at: new Date().toISOString(),
      status: 'sent',
      message_type: 'text',
    }
    
    // Adiciona otimista direto na Store Global
    addMessage(activeChat.remote_jid, optimisticMsg)

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remoteJid: activeChat.remote_jid,
          text: textToSend,
        }),
      })

      const responseData = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(responseData.error || 'Falha ao enviar')
      }

      // Reconciliação do Optimistic: Se a API devolveu a chave real, atualiza
      const realExternalId = responseData?.message?.key?.id || responseData?.key?.id
      if (realExternalId) {
        updateMessage(activeChat.remote_jid, optId, { external_id: realExternalId })
      }

      setSendError(null)

    } catch (err) {
      // Remove da Store se der erro
      useChatStore.getState().removeMessage(activeChat.remote_jid, optId)
      const msg = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
      setSendError(msg)
      setInputText(textToSend)
    } finally {
      setIsSending(false)
    }
  }

  const handleToggleAi = async () => {
    if (isProcessingAction) return
    setIsProcessingAction(true)
    const newState = !isAiActive
    try {
      const res = await fetch('/api/crm/ai-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remoteJid: activeChat.remote_jid,
          active: newState
        })
      })
      if (res.ok) {
        setIsAiActive(newState)
      } else {
        alert('Erro ao alterar status da IA')
      }
    } catch {
      alert('Erro ao conectar com o servidor')
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleResolve = async () => {
    if (!confirm('Deseja marcar este atendimento como resolvido?')) return
    if (isProcessingAction) return
    setIsProcessingAction(true)
    try {
      const res = await fetch('/api/crm/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remoteJid: activeChat.remote_jid
        })
      })
      if (res.ok) {
        alert('✅ Atendimento finalizado!')
        // Opcional: fechar janela ou limpar estado
      } else {
        alert('Erro ao resolver atendimento')
      }
    } catch {
      alert('Erro ao conectar com o servidor')
    } finally {
      setIsProcessingAction(false)
    }
  }

  const rawDisplayName = (activeChat.name as string) || cleanJid(activeChat.remote_jid)
  const displayName = formatPhoneAsName(rawDisplayName)
  const isNumber = /^\+?\d+$/.test(displayName)
  const displayJid = cleanJid(activeChat.remote_jid)

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0f12]">

      {/* Header */}
      <div className="h-[68px] px-6 flex items-center justify-between bg-[#13161b] border-b border-[#1e2028] shrink-0">
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${isNumber ? 'bg-[#1e2028] text-[#64748b]' : 'bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white'}`}>
            {isNumber ? <User size={20} /> : rawDisplayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-100 text-[15px] leading-tight">{displayName}</h3>
            <p className="text-[13px] text-[#64748b] mt-0.5">{displayJid.startsWith('55') ? `+55 (${displayJid.substring(2,4)}) ${displayJid.substring(4,9)}-${displayJid.substring(9)}` : `+${displayJid}`}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Ações Futuras (UI) */}
          <button onClick={() => alert('Transferência de lead em breve.')} title="Transferir Atendimento" className="p-2 rounded-md bg-[#1e2028] text-[#64748b] hover:text-white hover:bg-[#2a2d34] transition-colors">
            <ArrowRightLeft size={14} />
          </button>
          <button onClick={() => alert('Agendamento de follow-up em breve.')} title="Agendar Follow-up" className="p-2 rounded-md bg-[#1e2028] text-[#64748b] hover:text-white hover:bg-[#2a2d34] transition-colors">
            <Calendar size={14} />
          </button>
          <button onClick={() => alert('Gestão de cliente em breve.')} title="Adicionar Cliente" className="p-2 rounded-md bg-[#1e2028] text-[#64748b] hover:text-white hover:bg-[#2a2d34] transition-colors">
            <UserPlus size={14} />
          </button>
          <div className="w-[1px] h-6 bg-[#2a2d34] mx-1 self-center"></div>
          
          <button 
            onClick={handleToggleAi} 
            disabled={isProcessingAction}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              isAiActive 
                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
            }`}
          >
            <Bot size={14} className={isAiActive ? 'animate-pulse' : ''} /> {isAiActive ? 'IA Ativa' : 'IA Pausada'}
          </button>
          <button 
            onClick={handleResolve} 
            disabled={isProcessingAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1e2028] text-gray-400 text-[13px] font-medium hover:text-white hover:bg-emerald-600 transition-colors"
          >
            <CheckCircle2 size={14} /> Resolver
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#0d0f12]" 
      >
        {isLoadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#64748b] gap-3">
            <div className="w-16 h-16 rounded-full bg-[#13161b] flex items-center justify-center border border-[#1e2028]">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-[13px] bg-[#13161b] border border-[#1e2028] px-4 py-1.5 rounded-full shadow-sm">Nenhuma mensagem nesta conversa ainda.</p>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.external_id || msg.id} message={msg} />)
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-[#0d0f12] border-t border-[#1e2028] shrink-0">
        {sendError && (
          <p className="text-red-400 text-xs px-4 pb-2 flex items-center gap-1.5">
            <span>⚠️</span> {sendError}
          </p>
        )}
        <form onSubmit={handleSend} className="flex gap-2 max-w-5xl mx-auto items-center">
          <button type="button" onClick={() => alert('Envio de anexos em breve.')} title="Anexar arquivo" className="p-2.5 text-[#64748b] hover:text-gray-300 rounded-full hover:bg-[#1e2028] transition-colors">
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={e => { setSendError(null); setInputText(e.target.value) }}
            placeholder="Digite uma mensagem..."
            className="flex-1 bg-[#13161b] border border-[#1e2028] text-gray-100 rounded-lg px-4 py-3 text-[15px] focus:outline-none focus:border-[#3b82f6] placeholder-[#64748b]"
            disabled={isSending}
          />
          {inputText.trim() ? (
            <button
              type="submit"
              disabled={isSending}
              className="p-2.5 bg-[#3b82f6] text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg disabled:opacity-50"
            >
              {isSending ? <span className="text-[20px]">⏳</span> : <Send size={18} className="ml-0.5" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => alert('Gravação de áudio em breve.')}
              title="Gravar Áudio"
              className="p-2.5 text-[#64748b] hover:text-emerald-500 rounded-full hover:bg-[#1e2028] transition-colors"
            >
              <Mic size={20} />
            </button>
          )}
        </form>
      </div>

    </div>
  )
}
