'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import MessageBubble from './MessageBubble'
import { User, Mic, Paperclip, Send, Calendar, UserPlus, ArrowRightLeft, Bot, CheckCircle2 } from 'lucide-react'

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

interface Message {
  id: string
  external_id?: string
  content: string
  from_me: boolean
  created_at: string
  status?: string
  message_type?: string
  media_url?: string
}

interface ActiveChat {
  remote_jid: string
  name: string
  [key: string]: unknown
}

function cleanJid(jid: string): string {
  return jid
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace('@lid', '')
}

// Merge profissional com proteção contra regressão de estado e colisões de chaves
function mergeMessages(prev: Message[], incoming: Message[]): Message[] {
  const map = new Map<string, Message>()

  // 1. Sempre manter o que já existe no estado local
  prev.forEach(m => {
    const key = m.external_id || m.id
    map.set(key, m)
  })

  // 2. Mesclar de forma segura com o que vem do backend
  incoming.forEach(m => {
    const key = m.external_id || m.id
    const existing = map.get(key)

    if (!existing) {
      map.set(key, m)
    } else {
      // Substitui se for uma mensagem otimista que agora é real,
      // ou se o backend trouxe um status/versão mais recente.
      if (
        String(existing.id).startsWith('opt-') ||
        new Date(m.created_at) >= new Date(existing.created_at)
      ) {
        map.set(key, m)
      }
    }
  })

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export default function ChatWindow({ activeChat }: { activeChat: ActiveChat }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!activeChat?.remote_jid) return
    try {
      const res = await fetch(`/api/whatsapp/messages?remote_jid=${encodeURIComponent(activeChat.remote_jid)}&limit=60`, {
        cache: 'no-store'
      })
      if (!res.ok) return
      const data = await res.json() as Message[]
      setMessages(prev => {
        return mergeMessages(prev, data)
      })
    } catch {
      // silencioso — polling vai tentar de novo
    }
  }, [activeChat])

  useEffect(() => {
    if (!activeChat?.remote_jid) return

    // Garante que o polling anterior morra completamente
    if (pollRef.current) clearInterval(pollRef.current)

    // NÃO LIMPA AS MENSAGENS AQUI: setMessages([]) causava regressão visual/piscar
    fetchMessages()

    pollRef.current = setInterval(fetchMessages, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeChat?.remote_jid, fetchMessages])

  // Auto-scroll sem usar scrollIntoView (para não scrollar o layout main acidentalmente)
  useEffect(() => {
    if (messagesContainerRef.current) {
      const el = messagesContainerRef.current
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending) return

    const textToSend = inputText
    setInputText('')
    setIsSending(true)

    const optId = `opt-${Date.now()}`
    const optimisticMsg: Message = {
      id: optId,
      external_id: optId, // Força a chave para o merge funcionar perfeitamente depois
      content: textToSend,
      from_me: true,
      created_at: new Date().toISOString(),
      status: 'sent',
      message_type: 'text',
    }
    setMessages(prev => [...prev, optimisticMsg])

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
        setMessages(prev => prev.map(m => 
          m.id === optId ? { ...m, external_id: realExternalId } : m
        ))
      }

      // Chama fetchMessages de forma segura para atualizar o status sem bugar
      fetchMessages()

    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optId))
      const msg = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
      alert(`❌ ${msg}`)
      setInputText(textToSend)
    } finally {
      setIsSending(false)
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
          
          <button onClick={() => alert('Pausa de automação em breve.')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1e2028] text-[#64748b] text-[13px] font-medium hover:text-white hover:bg-[#2a2d34] transition-colors">
            <Bot size={14} /> Pausar IA
          </button>
          <button onClick={() => alert('Resolução de ticket em breve.')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[13px] font-medium hover:bg-emerald-500/20 transition-colors">
            <CheckCircle2 size={14} /> Resolver
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#0d0f12]" 
      >
        {messages.length === 0 ? (
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
        <form onSubmit={handleSend} className="flex gap-2 max-w-5xl mx-auto items-center">
          <button type="button" onClick={() => alert('Envio de anexos em breve.')} title="Anexar arquivo" className="p-2.5 text-[#64748b] hover:text-gray-300 rounded-full hover:bg-[#1e2028] transition-colors">
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
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
