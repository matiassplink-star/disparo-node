'use client'

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



function StatusIcon({ status }: { status?: string }) {
  if (status === 'read') {
    // Lido — dois checks azuis
    return <span className="ml-1 text-blue-300">✓✓</span>
  }
  if (status === 'delivered') {
    // Entregue — dois checks cinza
    return <span className="ml-1 text-blue-100/50">✓✓</span>
  }
  // Enviado — um check
  return <span className="ml-1 text-blue-100/40">✓</span>
}

export default function MessageBubble({ message }: { message: Message }) {
  const isMine = message.from_me
  const isOptimistic = String(message.id).startsWith('opt-')

  return (
    <div className={`flex w-full mb-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 relative shadow-sm transition-opacity ${
          isOptimistic ? 'opacity-60' : 'opacity-100'
        } ${
          isMine
            ? 'bg-[#005c4b] text-white rounded-br-none'
            : 'bg-[#1e2028] text-gray-100 rounded-bl-none border border-[#2a2d34]'
        }`}
      >
        {/* Conteúdo */}
        {message.message_type === 'image' && message.media_url ? (
          <img
            src={message.media_url}
            alt="Imagem"
            className="max-w-full rounded-lg mb-1"
          />
        ) : message.message_type === 'audio' ? (
          <div className="flex items-center gap-2 py-1">
            <span>🎤</span>
            <span className="text-xs text-gray-400">Mensagem de voz</span>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content || '[Mídia]'}
          </p>
        )}

        {/* Hora + Status */}
        <div
          className={`text-[10px] mt-1 flex items-center justify-end gap-0.5 ${
            isMine ? 'text-blue-100/70' : 'text-gray-500'
          }`}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {isMine && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  )
}
