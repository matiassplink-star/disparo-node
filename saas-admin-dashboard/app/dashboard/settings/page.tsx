'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/types'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [nome, setNome] = useState('')

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data)
          setNome(data.nome)
        }
      } catch (error) {
        console.error('Erro:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      if (res.ok) alert('Perfil atualizado!')
      else alert('Erro ao atualizar')
    } catch { alert('Erro ao salvar') }
    finally { setIsSaving(false) }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#22c55e', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#e8eaed' }}>Configurações</h1>
        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Gerencie seu perfil e preferências</p>
      </div>

      {/* Perfil */}
      <div className="rounded-lg p-5 space-y-4" style={{ background: '#16181c', border: '1px solid #2a2d34' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#e8eaed' }}>Perfil</h2>

        <div>
          <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Email</label>
          <input type="email" value={user?.email || ''} disabled
            className="w-full px-3 py-2 rounded-lg text-xs cursor-not-allowed"
            style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#6b7280' }}
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Nome</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-colors"
            style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2d34' }}
          />
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Plano</label>
            <span className="px-3 py-1 rounded-lg text-xs font-medium inline-block" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>{user?.plano}</span>
          </div>
          <div>
            <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Status</label>
            <span className="px-3 py-1 rounded-lg text-xs font-medium inline-block" style={{
              background: user?.status === 'ativo' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
              color: user?.status === 'ativo' ? '#22c55e' : '#ef4444',
            }}>{user?.status === 'ativo' ? '● Ativo' : '● Bloqueado'}</span>
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving}
          className="px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border-none disabled:opacity-50"
          style={{ background: '#22c55e', color: '#0a1a10' }}
        >{isSaving ? 'Salvando...' : 'Salvar alterações'}</button>
      </div>

      {/* Info */}
      <div className="rounded-lg p-5 space-y-2" style={{ background: '#16181c', border: '1px solid #2a2d34' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#e8eaed' }}>Informações da conta</h2>
        <div className="text-xs space-y-1.5" style={{ color: '#6b7280' }}>
          <p><span className="font-medium" style={{ color: '#e8eaed' }}>ID:</span> <code className="px-2 py-0.5 rounded text-[10px]" style={{ background: '#1c1f24' }}>{user?.id}</code></p>
          <p><span className="font-medium" style={{ color: '#e8eaed' }}>Criado em:</span> {user?.criado_em ? new Date(user.criado_em).toLocaleString('pt-BR') : '—'}</p>
          {user?.acesso_ate && (
            <p><span className="font-medium" style={{ color: '#e8eaed' }}>Acesso até:</span>{' '}
              <span style={{ color: new Date(user.acesso_ate) > new Date() ? '#22c55e' : '#ef4444' }}>
                {new Date(user.acesso_ate).toLocaleString('pt-BR')}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="rounded-lg p-5" style={{ background: '#16181c', border: '1px solid #2a2d34' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#e8eaed' }}>Sessão</h2>
        <button onClick={handleLogout}
          className="px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border-none"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >Sair da conta</button>
      </div>
    </div>
  )
}
