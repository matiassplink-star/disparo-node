'use client'

import { useState, useEffect, useRef } from 'react'
import { supabaseClient } from '@/lib/supabase'
import MessageBubble from './MessageBubble'

export default function ChatWindow({ activeChat }: { activeChat: any }) {
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = supabaseClient

  useEffect(() => {
    if (!activeChat) return
    
    // 1. Buscar histórico (últimas 50 mensagens para não pesar)
    fetchMessages()

    // 2. Assinar Supabase Realtime para Novas Mensagens Deste Contato
    const channel = supabase
      .channel(`chat_${activeChat.remote_jid}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `remote_jid=eq.${activeChat.remote_jid}`
      }, (payload) => {
        // Nova mensagem chegou! Adicionar ao final da lista
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChat])

  // Desce o scroll automaticamente quando chegar mensagem nova
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('remote_jid', activeChat.remote_jid)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) {
      setMessages(data.reverse()) // Inverte para as mais velhas ficarem em cima
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending) return

    const textToSend = inputText
    setInputText('')
    setIsSending(true)

    // Inserir mensagem otimisticamente (aparece antes da confirmação)
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

      // Atualiza com dados reais do banco (substitui otimístico)
      await fetchMessages()

    } catch {
      // Remove a mensagem otimística e devolve o texto
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      alert('Erro ao enviar mensagem. Verifique a conexão com o WhatsApp.')
      setInputText(textToSend)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-900/50">
      
      {/* Header do Chat */}
      <div className="h-16 border-b border-gray-800 px-6 flex items-center justify-between bg-gray-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl overflow-hidden">
            🤖
          </div>
          <div>
            <h3 className="font-bold text-white">{activeChat.name}</h3>
            <p className="text-xs text-gray-400">{activeChat.remote_jid}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Botões extras como Pausar IA, Resolver */}
          <button className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 text-sm hover:text-white transition-colors">
            ⏸️ Pausar IA
          </button>
          <button className="px-3 py-1.5 rounded-md bg-green-500/10 text-green-500 text-sm hover:bg-green-500/20 transition-colors">
            ✔️ Resolver
          </button>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#0b141a]">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Carregando mensagens ou nenhuma mensagem anterior...
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Envio */}
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
