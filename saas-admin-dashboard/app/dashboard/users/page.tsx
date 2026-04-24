'use client'

import { useState } from 'react'
import { UserList } from '@/components/dashboard/UserList'
import { UserForm, UserFormData } from '@/components/dashboard/UserForm'

export default function UsersPage() {
  const [showForm, setShowForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreateUser = async (data: UserFormData) => {
    setIsCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setShowForm(false)
        setRefreshKey((k) => k + 1)
      } else {
        const err = await res.json()
        alert('Erro: ' + (err.error || 'Erro ao criar'))
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#e8eaed' }}>Gerenciar Usuários</h1>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Crie, edite e controle o acesso dos usuários</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border-none"
          style={{
            background: showForm ? 'rgba(239,68,68,0.1)' : '#22c55e',
            color: showForm ? '#ef4444' : '#0a1a10',
          }}
        >
          {showForm ? '✕ Cancelar' : '+ Novo Usuário'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg p-5" style={{ background: '#16181c', border: '1px solid #2a2d34' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#e8eaed' }}>Criar novo usuário</h2>
          <UserForm onSubmit={handleCreateUser} isLoading={isCreating} />
        </div>
      )}

      <UserList
        key={refreshKey}
        onDeleteSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
