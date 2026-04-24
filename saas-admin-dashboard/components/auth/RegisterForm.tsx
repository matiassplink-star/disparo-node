'use client'

import { useState } from 'react'
import Link from 'next/link'

export function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nome: '',
    telefone: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.email) newErrors.email = 'Email é obrigatório'
    if (!formData.nome) newErrors.nome = 'Nome é obrigatório'
    if (!formData.password) newErrors.password = 'Senha é obrigatória'
    if (formData.password.length < 6) newErrors.password = 'Senha deve ter pelo menos 6 caracteres'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'As senhas não correspondem'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nome: formData.nome,
          telefone: formData.telefone || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
      } else {
        setErrors({ submit: data.error || 'Erro ao cadastrar' })
      }
    } catch {
      setErrors({ submit: 'Erro ao conectar ao servidor' })
    } finally {
      setIsLoading(false)
    }
  }

  // Tela de sucesso — conta ativada direto
  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(34,197,94,0.12)' }}>
          <span className="text-3xl">🎉</span>
        </div>
        <h3 className="text-lg font-bold" style={{ color: '#e8eaed' }}>Conta criada com sucesso!</h3>
        <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
          Bem-vindo(a) ao ZapLink, <strong style={{ color: '#e8eaed' }}>{formData.nome}</strong>.
          <br />Seus <strong style={{ color: '#22c55e' }}>3 dias grátis</strong> foram ativados imediatamente!
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium transition-all mt-2"
          style={{ background: '#22c55e', color: '#0a1a10' }}
        >
          Fazer Login Agora
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {errors.submit}
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Nome</label>
        <input
          type="text" value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="João Silva"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{ background: '#1c1f24', border: `1px solid ${errors.nome ? '#ef4444' : '#2a2d34'}`, color: '#e8eaed' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = errors.nome ? '#ef4444' : '#2a2d34' }}
        />
        {errors.nome && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.nome}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Email</label>
        <input
          type="email" value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="seu@email.com"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{ background: '#1c1f24', border: `1px solid ${errors.email ? '#ef4444' : '#2a2d34'}`, color: '#e8eaed' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = errors.email ? '#ef4444' : '#2a2d34' }}
        />
        {errors.email && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.email}</p>}
      </div>

      {/* Telefone */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Telefone / WhatsApp <span style={{ color: '#4b5563' }}>(opcional)</span></label>
        <input
          type="text" value={formData.telefone}
          onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
          placeholder="(34) 99999-9999"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2d34' }}
        />
      </div>

      {/* Senha */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Senha</label>
        <input
          type="password" value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Mínimo 6 caracteres"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{ background: '#1c1f24', border: `1px solid ${errors.password ? '#ef4444' : '#2a2d34'}`, color: '#e8eaed' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = errors.password ? '#ef4444' : '#2a2d34' }}
        />
        {errors.password && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.password}</p>}
      </div>

      {/* Confirmar */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Confirmar Senha</label>
        <input
          type="password" value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          placeholder="Repita a senha"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{ background: '#1c1f24', border: `1px solid ${errors.confirmPassword ? '#ef4444' : '#2a2d34'}`, color: '#e8eaed' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = errors.confirmPassword ? '#ef4444' : '#2a2d34' }}
        />
        {errors.confirmPassword && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.confirmPassword}</p>}
      </div>

      <button
        type="submit" disabled={isLoading}
        className="w-full py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer border-none"
        style={{ background: '#22c55e', color: '#0a1a10' }}
      >
        {isLoading ? 'Criando conta...' : 'Criar conta'}
      </button>

      <p className="text-center text-xs" style={{ color: '#6b7280' }}>
        Ao criar sua conta, você ganha{' '}
        <strong style={{ color: '#22c55e' }}>3 dias de acesso grátis</strong>.
      </p>

      <p className="text-center text-xs" style={{ color: '#6b7280' }}>
        Já tem conta?{' '}
        <Link href="/auth/login" className="font-medium hover:underline" style={{ color: '#22c55e' }}>
          Faça login
        </Link>
      </p>
    </form>
  )
}
