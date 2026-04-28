'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabaseClient } from '@/lib/supabase'
import MessageBubble from './MessageBubble'

// Limpa o remote_jid para exibição (remove sufixos do WhatsApp)
function cleanJid(jid: string): string {
  return jid
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace('@lid', '')
}

export default function ChatWindow({ activeChat }: { activeChat: Record<string, unknown> }) {
  const [messages, setMessages] = useState<Record<string, unknown>[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = supabaseClient
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!activeChat?.remote_jid) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('remote_jid', activeChat.remote_jid as string)
      .order('created_at', { ascending: false })
      .limit(60)

    if (data) {
      setMessages(data.reverse())
    }
  }, [activeChat, supabase])

  useEffect(() => {
    if (!activeChat) return
    fetchMessages()

    // Supabase Realtime — ouve novas mensagens em tempo real
    const channel = supabase
      .channel(`chat_${activeChat.remote_jid}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `remote_jid=eq.${activeChat.remote_jid}`
      }, (payload) => {
        setMessages(prev => {
          // Evita duplicar a mensagem otimística
          const exists = prev.some(m => m.id === (payload.new as Record<string, unknown>).id)
          if (exists) return prev
          return [...prev.filter(m => !String(m.id).startsWith('opt-')), payload.new as Record<string, unknown>]
        })
      })
      .subscribe()

    // Fallback: polling a cada 5s caso o Realtime não esteja ativo
    pollRef.current = setInterval(fetchMessages, 5000)

    return () => {
      supabase.removeChannel(channel)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeChat, fetchMessages, supabase])

  // Auto-scroll ao chegar mensagem nova
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending) return

    const textToSend = inputText
    setInputText('')
    setIsSending(true)

    const optimisticMsg = {
      id: `opt-${Date.now()}`,
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
          text: textToSend
        })
      })

      if (!res.ok) throw new Error('Falha ao enviar')
      // Após enviar, busca mensagens reais (substitui otimística)
      await fetchMessages()
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      alert('Erro ao enviar mensagem. Verifique a conexão com o WhatsApp.')
      setInputText(textToSend)
    } finally {
      setIsSending(false)
    }
  }

  const displayName = (activeChat.name as string) || cleanJid(activeChat.remote_jid as string)
  const displayJid = cleanJid(activeChat.remote_jid as string)

  return (
    <div className="flex flex-col h-full w-full bg-gray-900/50">

      {/* Header */}
      <div className="h-16 border-b border-gray-800 px-6 flex items-center justify-between bg-gray-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
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
          messages.map(msg => <MessageBubble key={String(msg.id)} message={msg} />)
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
