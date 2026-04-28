'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabaseClient } from '@/lib/supabase'
import MessageBubble from './MessageBubble'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
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

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  const displayName = (activeChat.name as string) || cleanJid(activeChat.remote_jid)
  const displayJid = cleanJid(activeChat.remote_jid)

  return (
    <div className="flex flex-col h-full w-full bg-gray-900/50">

      {/* Header */}
      <div className="h-16 border-b border-gray-800 px-6 flex items-center justify-between bg-gray-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-white">{displayName}</h3>
            <p className="text-xs text-gray-400">{displayJid}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 text-sm hover:text-white transition-colors">
            ⏸️ Pausar IA
          </button>
          <button className="px-3 py-1.5 rounded-md bg-green-500/10 text-green-500 text-sm hover:bg-green-500/20 transition-colors">
            ✔️ Resolver
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#0b141a]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
            <span className="text-3xl">💬</span>
            <p className="text-sm">Nenhuma mensagem nesta conversa ainda.</p>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.external_id || msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-900 border-t border-gray-800 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <button type="button" className="p-3 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
            📎
          </button>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-gray-800 text-white rounded-full px-6 py-3 focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSending ? '⏳' : '➤'}
          </button>
        </form>
      </div>

    </div>
  )
}
