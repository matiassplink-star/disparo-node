export type UserPlan = 'free' | 'pro' | 'premium' | 'mensal' | 'semestral' | 'anual' | 'admin'
export type UserStatus = 'ativo' | 'bloqueado'

export interface User {
  id: string
  email: string
  nome: string
  plano: UserPlan
  status: UserStatus
  email_verified: boolean
  acesso_ate: string | null
  avatar_url: string | null
  criado_em?: string
  atualizado_em?: string
  created_at?: string
  updated_at?: string
  telefone?: string
}

export interface Account {
  id: string
  user_id: string
  limite_envios: number
  criado_em: string
}

export interface AuthSession {
  user: User | null
  isLoading: boolean
  isLoggedIn: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  nome: string
}
