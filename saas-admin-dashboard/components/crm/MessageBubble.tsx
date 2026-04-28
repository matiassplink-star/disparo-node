export default function MessageBubble({ message }: { message: any }) {
  const isMine = message.from_me

  return (
    <div className={`flex w-full mb-4 ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[75%] rounded-2xl px-4 py-2 relative shadow-sm ${
          isMine 
            ? 'bg-primary text-white rounded-br-none' 
            : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isMine && (
            <span className="ml-1">
              {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
