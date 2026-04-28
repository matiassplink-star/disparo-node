'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabaseClient } from '@/lib/supabase'
import MessageBubble from './MessageBubble'
import { User } from 'lucide-react'

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

// Merge sem duplicatas por id ou external_id
function mergeMessages(prev: Message[], incoming: Message[]): Message[] {
  const seen = new Set<string>()
  const result: Message[] = []
  for (const m of [...prev, ...incoming]) {
    const key = m.external_id || m.id
    if (!seen.has(key)) {
      seen.add(key)
      result.push(m)
    } else {
      // Substituir a versão mais antiga pela mais nova (ex: status atualizado)
      const idx = result.findIndex(r => (r.external_id || r.id) === key)
      if (idx !== -1) result[idx] = m
    }
  }
  return result.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export default function ChatWindow({ activeChat }: { activeChat: ActiveChat }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = supabaseClient

  const fetchMessages = useCallback(async () => {
    if (!activeChat?.remote_jid) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('remote_jid', activeChat.remote_jid)
      .order('created_at', { ascending: false })
      .limit(60)

    if (data) {
      // Ordem cronológica (mais antigas em cima)
      setMessages(prev => {
        const fresh = (data as Message[]).reverse()
        // Manter mensagens otimísticas até confirmação
        const optimistic = prev.filter(m => String(m.id).startsWith('opt-'))
        return mergeMessages(fresh, optimistic)
      })
    }
  }, [activeChat, supabase])

  useEffect(() => {
    if (!activeChat) return

    // Limpa mensagens imediatamente ao trocar de conversa
    setMessages([])
    fetchMessages()

    // Canal INSERT — novas mensagens
    const insertChannel = supabase
      .channel(`chat_insert_${activeChat.remote_jid}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `remote_jid=eq.${activeChat.remote_jid}`,
      }, (payload) => {
        setMessages(prev => mergeMessages(prev, [payload.new as Message]))
      })
      .subscribe()

    // Canal UPDATE — status de entrega/leitura
    const updateChannel = supabase
      .channel(`chat_update_${activeChat.remote_jid}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `remote_jid=eq.${activeChat.remote_jid}`,
      }, (payload) => {
        const updated = payload.new as Message
        setMessages(prev =>
          prev.map(m =>
            (m.external_id && m.external_id === updated.external_id) || m.id === updated.id
              ? { ...m, status: updated.status }
              : m
          )
        )
      })
      .subscribe()

    // Polling de 5s como fallback
    pollRef.current = setInterval(fetchMessages, 5000)

    return () => {
      supabase.removeChannel(insertChannel)
      supabase.removeChannel(updateChannel)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeChat, fetchMessages, supabase])

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

      if (!res.ok) throw new Error('Falha ao enviar')

      // Remove otimística — a mensagem real chega via Realtime ou polling
      // Aguarda 1s antes de buscar para o webhook processar
      setTimeout(fetchMessages, 1000)

    } catch {
      setMessages(prev => prev.filter(m => m.id !== optId))
      alert('Erro ao enviar mensagem. Verifique a conexão com o WhatsApp.')
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
    <div className="flex flex-col h-full w-full bg-[#0b141a]">

      {/* Header */}
      <div className="h-[68px] px-6 flex items-center justify-between bg-[#202c33] shrink-0">
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${isNumber ? 'bg-[#1e2028] text-[#64748b]' : 'bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white'}`}>
            {isNumber ? <User size={20} /> : rawDisplayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-100 text-[15px] leading-tight">{displayName}</h3>
            <p className="text-[13px] text-[#8696a0] mt-0.5">{displayJid.startsWith('55') ? `+55 (${displayJid.substring(2,4)}) ${displayJid.substring(4,9)}-${displayJid.substring(9)}` : `+${displayJid}`}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-md bg-[#2a3942] text-[#8696a0] text-[13px] hover:text-white transition-colors">
            ⏸️ Pausar IA
          </button>
          <button className="px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[13px] hover:bg-emerald-500/20 transition-colors">
            ✔️ Resolver
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 scroll-smooth" 
        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat', backgroundSize: '400px' }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#8696a0] gap-3">
            <div className="w-16 h-16 rounded-full bg-[#202c33] flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-[13px] bg-[#202c33] px-4 py-1.5 rounded-full shadow-sm">Nenhuma mensagem nesta conversa ainda.</p>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.external_id || msg.id} message={msg} />)
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-[#202c33] shrink-0">
        <form onSubmit={handleSend} className="flex gap-3 max-w-5xl mx-auto">
          <button type="button" className="p-3 text-[#8696a0] hover:text-gray-300 rounded-full hover:bg-[#2a3942] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          </button>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Digite uma mensagem"
            className="flex-1 bg-[#2a3942] text-gray-100 rounded-lg px-4 py-3 text-[15px] focus:outline-none placeholder-[#8696a0]"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-3 text-[#8696a0] hover:text-gray-300 rounded-full hover:bg-[#2a3942] transition-colors disabled:opacity-50"
          >
            {isSending ? '⏳' : <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>}
          </button>
        </form>
      </div>

    </div>
  )
}
