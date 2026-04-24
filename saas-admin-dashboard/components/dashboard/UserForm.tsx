'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserPlan } from '@/types'

interface UserFormProps {
  onSubmit: (data: UserFormData) => Promise<void>
  isLoading?: boolean
}

export interface UserFormData {
  email: string
  nome: string
  password?: string
  plano: UserPlan
}

export function UserForm({ onSubmit, isLoading }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    nome: '',
    password: '',
    plano: 'free',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) newErrors.email = 'Email é obrigatório'
    if (!formData.nome) newErrors.nome = 'Nome é obrigatório'
    if (!formData.password) newErrors.password = 'Senha é obrigatória'
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await onSubmit(formData)
      setFormData({
        email: '',
        nome: '',
        password: '',
        plano: 'free',
      })
    } catch (error) {
      console.error('Erro ao submeter formulário:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) =>
          setFormData({ ...formData, email: e.target.value })
        }
        error={errors.email}
        placeholder="usuario@exemplo.com"
      />

      <Input
        label="Nome"
        type="text"
        value={formData.nome}
        onChange={(e) =>
          setFormData({ ...formData, nome: e.target.value })
        }
        error={errors.nome}
        placeholder="João Silva"
      />

      <Input
        label="Senha"
        type="password"
        value={formData.password}
        onChange={(e) =>
          setFormData({ ...formData, password: e.target.value })
        }
        error={errors.password}
        placeholder="••••••"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Plano
        </label>
        <select
          value={formData.plano}
          onChange={(e) =>
            setFormData({
              ...formData,
              plano: e.target.value as UserPlan,
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
        className="w-full"
      >
        Criar Usuário
      </Button>
    </form>
  )
}
