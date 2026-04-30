// ─────────────────────────────────────────────
// Tipos centralizados do ZapLink 2.0
// Importar com: import type { Message, Contact, Chat } from '@/types'
// ─────────────────────────────────────────────

export interface Message {
  id: string
  external_id?: string | null
  user_id?: string
  instance_id?: string
  remote_jid: string
  content: string
  from_me: boolean
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker'
  status: 'sent' | 'delivered' | 'read' | 'failed'
  media_url?: string | null
  created_at: string
}

export interface Contact {
  id: string
  user_id: string
  instance_id?: string
  phone: string
  name: string
  is_valid?: boolean | null
  tags: string[]
  chat_status?: 'open' | 'paused_ai' | 'closed'
  created_at: string
}

export interface Chat {
  id: string
  remote_jid: string
  name: string
  chat_status: 'open' | 'paused_ai' | 'closed'
  lastMessage: {
    content: string
    from_me: boolean
    created_at: string
    message_type?: string
  } | null
  updated_at: string
  tags: string[]
}

export interface KanbanCard {
  id: string
  column_id: string
  contact_name: string
  contact_phone: string
  notes?: string
  value?: number
  position: number
}

export interface KanbanColumn {
  id: string
  title: string
  color: string
  position: number
  cards: KanbanCard[]
}

export interface WhatsAppInstance {
  id: string
  user_id: string
  instance_name: string
  phone_number?: string
  status: 'disconnected' | 'connecting' | 'connected'
  created_at: string
  updated_at: string
}

// ─── Auth & User ──────────────────────────────────────────────

export type UserPlan = 'free' | 'starter' | 'pro' | 'enterprise'
export type UserStatus = 'ativo' | 'bloqueado' | 'active' | 'inactive' | 'suspended'

export interface User {
  id: string
  email: string
  // Campos do schema real (português)
  nome?: string | null
  plano?: UserPlan | string
  status?: UserStatus | string
  acesso_ate?: string | null
  // Campos alternativos (inglês — compatibilidade)
  name?: string | null
  plan?: UserPlan | string
  role?: 'admin' | 'member' | string
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface LoginCredentials {
  email: string
  password: string
}
