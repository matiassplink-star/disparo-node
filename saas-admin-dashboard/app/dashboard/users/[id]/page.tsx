'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { User } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({ nome: '', plano: '', status: '', acesso_ate: '' })

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`)
        if (res.ok) {
          const data = await res.json()
          setUser(data)
          setFormData({
            nome: data.nome || '',
            plano: data.plano || 'free',
            status: data.status || 'ativo',
            acesso_ate: data.acesso_ate ? new Date(data.acesso_ate).toISOString().slice(0, 16) : '',
          })
        } else {
          alert('Usuário não encontrado')
          router.push('/dashboard/users')
        }
      } catch (error) {
        console.error('Erro:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUser()
  }, [userId, router])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const body: Record<string, unknown> = {
        nome: formData.nome,
        plano: formData.plano,
        status: formData.status,
      }
      if (formData.acesso_ate) {
        body.acesso_ate = new Date(formData.acesso_ate).toISOString()
      } else {
        body.acesso_ate = null
      }

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        alert('Usuário atualizado com sucesso!')
        router.push('/dashboard/users')
      } else {
        const err = await res.json()
        alert('Erro: ' + (err.error || 'Erro ao atualizar'))
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#22c55e', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#e8eaed' }}>Editar Usuário</h1>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{user.email}</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/users')}
          className="px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border-none"
          style={{ background: 'transparent', color: '#6b7280' }}
          onMouseOver={(e) => { e.currentTarget.style.color = '#e8eaed' }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#6b7280' }}
        >
          ← Voltar
        </button>
      </div>

      <div className="rounded-xl p-6 space-y-5 shadow-2xl" style={{ background: '#16181c', border: '1px solid #2a2d34' }}>
        <div>
          <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Nome</label>
          <input
            type="text" value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2d34' }}
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Plano</label>
          <select
            value={formData.plano}
            onChange={(e) => setFormData({ ...formData, plano: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2d34' }}
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2d34' }}
          >
            <option value="ativo">Ativo</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Acesso válido até</label>
          <input
            type="datetime-local"
            value={formData.acesso_ate}
            onChange={(e) => setFormData({ ...formData, acesso_ate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed', colorScheme: 'dark' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2d34' }}
          />
          <p className="text-[10px] mt-1.5" style={{ color: '#4b5563' }}>Deixe vazio para revogar o acesso.</p>
        </div>

        {/* Atalhos rápidos de acesso */}
        <div>
          <label className="block text-[10px] font-medium tracking-wider uppercase mb-2" style={{ color: '#6b7280' }}>Atalhos rápidos de dias</label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '+1 dia', dias: 1 },
              { label: '+7 dias', dias: 7 },
              { label: '+30 dias', dias: 30 },
              { label: '+90 dias', dias: 90 },
              { label: '+180 dias', dias: 180 },
              { label: '+1 ano', dias: 365 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  const date = new Date(Date.now() + p.dias * 24 * 60 * 60 * 1000)
                  setFormData({ ...formData, acesso_ate: date.toISOString().slice(0, 16) })
                }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border-none"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.15)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)' }}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, acesso_ate: '' })}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border-none"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
            >
              Revogar acesso
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-5 mt-5" style={{ borderTop: '1px solid #2a2d34' }}>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none disabled:opacity-50"
            style={{ background: '#22c55e', color: '#0a1a10' }}
          >
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button 
            onClick={() => router.push('/dashboard/users')}
            className="px-5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none"
            style={{ background: 'transparent', color: '#6b7280' }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#e8eaed' }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#6b7280' }}
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl p-4 text-[11px] space-y-1.5" style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#6b7280' }}>
        <p><span className="font-medium" style={{ color: '#9ca3af' }}>ID:</span> {(user as any).id}</p>
        <p><span className="font-medium" style={{ color: '#9ca3af' }}>Telefone:</span> {(user as any).telefone || 'Não informado'}</p>
        <p><span className="font-medium" style={{ color: '#9ca3af' }}>Criado em:</span> {new Date((user as any).created_at || (user as any).criado_em).toLocaleString('pt-BR')}</p>
        <p><span className="font-medium" style={{ color: '#9ca3af' }}>Atualizado em:</span> {new Date((user as any).updated_at || (user as any).atualizado_em).toLocaleString('pt-BR')}</p>
      </div>
    </div>
  )
}
