'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, X, GripVertical, PhoneCall, DollarSign } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────

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

// ─── Card Component (Sortable) ────────────────────────────────────

function SortableCard({
  card,
  onDelete,
  onOpenChat,
}: {
  card: KanbanCard
  onDelete: (id: string) => void
  onOpenChat: (phone: string, name: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-[#1c1f26] border border-[#2a2d34] rounded-xl p-3 shadow-sm hover:border-[#3b82f6]/40 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 text-[#3b4050] hover:text-[#64748b] cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{card.contact_name}</p>
          <p className="text-[11px] text-[#64748b] truncate">{card.contact_phone}</p>

          {card.notes && (
            <p className="text-[11px] text-[#8b949e] mt-1.5 line-clamp-2">{card.notes}</p>
          )}

          <div className="flex items-center justify-between mt-2">
            {card.value && card.value > 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <DollarSign size={10} />
                {card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            ) : (
              <span />
            )}

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onOpenChat(card.contact_phone, card.contact_name)}
                title="Abrir chat"
                className="p-1 rounded hover:bg-[#3b82f6]/20 text-[#3b82f6] transition-colors"
              >
                <PhoneCall size={12} />
              </button>
              <button
                onClick={() => onDelete(card.id)}
                title="Remover card"
                className="p-1 rounded hover:bg-red-500/20 text-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Column Component ─────────────────────────────────────────────

function KanbanColumn({
  column,
  onDeleteCard,
  onOpenChat,
  onAddCard,
}: {
  column: KanbanColumn
  onDeleteCard: (cardId: string) => void
  onOpenChat: (phone: string, name: string) => void
  onAddCard: (columnId: string, phone: string, name: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')

  const handleAdd = () => {
    if (!phone.trim()) return
    onAddCard(column.id, phone.trim(), name.trim() || phone.trim())
    setPhone('')
    setName('')
    setShowForm(false)
  }

  return (
    <div className="flex flex-col w-72 shrink-0 bg-[#13161b] border border-[#2a2d34] rounded-2xl overflow-hidden">
      {/* Header da coluna */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d34]"
        style={{ borderLeftColor: column.color, borderLeftWidth: 3 }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="text-sm font-bold text-white">{column.title}</h3>
          <span className="text-[11px] text-[#64748b] bg-[#1c1f26] px-2 py-0.5 rounded-full">
            {column.cards.length}
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[#64748b] hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Form de adicionar card */}
      {showForm && (
        <div className="p-3 border-b border-[#2a2d34] bg-[#1c1f26] space-y-2">
          <input
            autoFocus
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Telefone (ex: 5511999999999)"
            className="w-full bg-[#13161b] border border-[#2a2d34] rounded-lg px-3 py-2 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
          />
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome do lead (opcional)"
            className="w-full bg-[#13161b] border border-[#2a2d34] rounded-lg px-3 py-2 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!phone.trim()}
              className="flex-1 text-xs py-1.5 rounded-lg bg-[#3b82f6] text-white font-medium hover:bg-[#2563eb] disabled:opacity-40 transition-colors"
            >
              Adicionar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2d34] text-[#64748b] hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
        <SortableContext
          items={column.cards.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.cards.map(card => (
            <SortableCard
              key={card.id}
              card={card}
              onDelete={onDeleteCard}
              onOpenChat={onOpenChat}
            />
          ))}
        </SortableContext>

        {column.cards.length === 0 && (
          <div className="flex items-center justify-center h-20 text-[11px] text-[#3b4050] italic">
            Arraste cards aqui
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Kanban Board ────────────────────────────────────────────

export default function KanbanBoard({
  columns,
  onMoveCard,
  onDeleteCard,
  onAddCard,
  onOpenChat,
}: {
  columns: KanbanColumn[]
  onMoveCard: (cardId: string, toColumnId: string, toPosition: number) => void
  onDeleteCard: (cardId: string) => void
  onAddCard: (columnId: string, phone: string, name: string) => void
  onOpenChat: (phone: string, name: string) => void
}) {
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const findCard = (id: string) => {
    for (const col of columns) {
      const card = col.cards.find(c => c.id === id)
      if (card) return card
    }
    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCard(findCard(event.active.id as string))
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Handled in parent for optimistic UI
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Descobrir a coluna de destino
    let toColumnId: string | null = null
    let toPosition = 0

    for (const col of columns) {
      const idx = col.cards.findIndex(c => c.id === over.id)
      if (idx !== -1) {
        toColumnId = col.id
        toPosition = idx
        break
      }
      // Se o over é o próprio id da coluna (drop na área vazia)
      if (col.id === over.id) {
        toColumnId = col.id
        toPosition = col.cards.length
        break
      }
    }

    if (toColumnId) {
      onMoveCard(active.id as string, toColumnId, toPosition)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            onDeleteCard={onDeleteCard}
            onOpenChat={onOpenChat}
            onAddCard={onAddCard}
          />
        ))}

        {/* Placeholder para nova coluna (futuro) */}
        <div className="flex items-start pt-1 shrink-0">
          <div className="w-72 border-2 border-dashed border-[#2a2d34] rounded-2xl flex items-center justify-center h-24 text-[#3b4050] hover:border-[#3b82f6]/30 hover:text-[#64748b] transition-colors cursor-pointer">
            <span className="text-xs">+ Nova coluna</span>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="bg-[#1c1f26] border border-[#3b82f6]/50 rounded-xl p-3 shadow-2xl w-72 rotate-2 opacity-90">
            <p className="text-sm font-semibold text-white">{activeCard.contact_name}</p>
            <p className="text-[11px] text-[#64748b]">{activeCard.contact_phone}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
