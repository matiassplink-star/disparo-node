'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { User, UserStatus } from '@/types'

interface UserListProps {
  onDeleteSuccess?: () => void
}

export function UserList({ onDeleteSuccess }: UserListProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [searchEmail, setSearchEmail] = useState('')
  const [acessoDropdown, setAcessoDropdown] = useState<string | null>(null)

  const itemsPerPage = 10

  useEffect(() => {
    fetchUsers()
  }, [page, searchEmail])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search: searchEmail,
      })
      const res = await fetch(`/api/users?${query}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers(users.filter((u) => u.id !== id))
        onDeleteSuccess?.()
      } else {
        alert('Erro ao deletar usuário')
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const handleStatusChange = async (userId: string, currentStatus: UserStatus) => {
    const newStatus: UserStatus = currentStatus === 'ativo' ? 'bloqueado' : 'ativo'
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setUsers(users.map((u) => u.id === userId ? { ...u, status: newStatus } : u))
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const concederAcesso = async (userId: string, dias: number) => {
    const acesso_ate = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString()
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acesso_ate }),
      })
      if (res.ok) {
        setUsers(users.map((u) => u.id === userId ? { ...u, acesso_ate } : u))
        setAcessoDropdown(null)
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const revogarAcesso = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acesso_ate: null }),
      })
      if (res.ok) {
        setUsers(users.map((u) => u.id === userId ? { ...u, acesso_ate: null } : u))
        setAcessoDropdown(null)
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const getAcessoInfo = (user: User) => {
    if (user.plano === 'admin') return { label: 'Admin', bg: 'rgba(139,92,246,0.1)', color: '#a78bfa' }
    if (!user.acesso_ate) return { label: 'Sem acesso', bg: 'rgba(107,114,128,0.1)', color: '#6b7280' }
    const dias = Math.ceil((new Date(user.acesso_ate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (dias <= 0) return { label: 'Expirado', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' }
    if (dias <= 3) return { label: `${dias}d`, bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' }
    return { label: `${dias}d`, bg: 'rgba(34,197,94,0.12)', color: '#22c55e' }
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#22c55e', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  const periodos = [
    { label: '1 hora', dias: 1 / 24 },
    { label: '1 dia', dias: 1 },
    { label: '7 dias', dias: 7 },
    { label: '30 dias', dias: 30 },
    { label: '90 dias', dias: 90 },
    { label: '180 dias', dias: 180 },
    { label: '1 ano', dias: 365 },
  ]

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="email"
        placeholder="Buscar por email..."
        value={searchEmail}
        onChange={(e) => { setSearchEmail(e.target.value); setPage(1) }}
        className="w-full px-4 py-2 rounded-lg text-sm outline-none transition-colors"
        style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2d34' }}
      />

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#16181c', border: '1px solid #2a2d34' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#1c1f24', borderBottom: '1px solid #2a2d34' }}>
              {['Email', 'Nome', 'Plano', 'Status', 'Acesso', 'Válido até', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium tracking-wider uppercase" style={{ color: '#6b7280', fontFamily: "'DM Mono', monospace" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const acesso = getAcessoInfo(user)
              return (
                <tr key={user.id} className="transition-colors" style={{ borderBottom: '1px solid #2a2d34' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#1c1f24' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <td className="px-4 py-2.5 text-xs font-mono" style={{ color: '#e8eaed' }}>{user.email}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: '#e8eaed' }}>{user.nome}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>{user.plano}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleStatusChange(user.id, user.status)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer border-none"
                      style={{
                        background: user.status === 'ativo' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                        color: user.status === 'ativo' ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {user.status === 'ativo' ? '● Ativo' : '● Bloqueado'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: acesso.bg, color: acesso.color }}>{acesso.label}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[10px] font-mono" style={{ color: '#6b7280' }}>
                    {user.acesso_ate ? new Date(user.acesso_ate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 relative">
                      <div className="relative">
                        <button onClick={() => setAcessoDropdown(acessoDropdown === user.id ? null : user.id)}
                          className="px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer border-none"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}
                        >⏱ Acesso</button>
                        {acessoDropdown === user.id && (
                          <div className="absolute top-full left-0 mt-1 rounded-lg shadow-2xl z-50 min-w-[150px] py-1" style={{ background: '#1c1f24', border: '1px solid #353840' }}>
                            {periodos.map((p) => (
                              <button key={p.label} onClick={() => concederAcesso(user.id, p.dias)}
                                className="block w-full text-left px-3 py-1.5 text-[11px] transition-colors cursor-pointer border-none"
                                style={{ color: '#e8eaed', background: 'transparent' }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.12)'; e.currentTarget.style.color = '#22c55e' }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#e8eaed' }}
                              >+ {p.label}</button>
                            ))}
                            <div style={{ height: '1px', background: '#353840', margin: '4px 0' }} />
                            <button onClick={() => revogarAcesso(user.id)}
                              className="block w-full text-left px-3 py-1.5 text-[11px] transition-colors cursor-pointer border-none"
                              style={{ color: '#ef4444', background: 'transparent' }}
                              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                            >✕ Revogar</button>
                          </div>
                        )}
                      </div>
                      <Link href={`/dashboard/users/${user.id}`}>
                        <button className="px-2 py-1 rounded text-[10px] font-medium cursor-pointer border-none"
                          style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}
                        >Editar</button>
                      </Link>
                      <button onClick={() => handleDelete(user.id)}
                        className="px-2 py-1 rounded text-[10px] font-medium cursor-pointer border-none"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                      >Deletar</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-xs" style={{ color: '#6b7280' }}>Nenhum usuário encontrado</div>
      )}

      <div className="flex justify-between items-center">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 cursor-pointer border-none"
          style={{ background: '#1c1f24', color: '#e8eaed', border: '1px solid #2a2d34' }}
        >← Anterior</button>
        <span className="text-xs font-mono" style={{ color: '#6b7280' }}>Página {page}</span>
        <button onClick={() => setPage(page + 1)} disabled={users.length < itemsPerPage}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 cursor-pointer border-none"
          style={{ background: '#1c1f24', color: '#e8eaed', border: '1px solid #2a2d34' }}
        >Próxima →</button>
      </div>
    </div>
  )
}
