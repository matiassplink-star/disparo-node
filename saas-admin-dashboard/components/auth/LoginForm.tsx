'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LoginCredentials } from '@/types'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<LoginCredentials>({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState<{ type: string; text: string } | null>(null)

  useEffect(() => {
    const verified = searchParams.get('verified')
    const message = searchParams.get('message')
    if (verified && message) {
      setVerifyMessage({ type: verified, text: decodeURIComponent(message) })
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!formData.email) newErrors.email = 'Email é obrigatório'
    if (!formData.password) newErrors.password = 'Senha é obrigatória'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const data = await res.json()
        const plano = data.user?.plano
        if (plano === 'admin') {
          router.push('/dashboard')
        } else {
          router.push('/dashboard/whatsapp')
        }
      } else {
        let message = 'Erro ao fazer login'
        try {
          const data = await res.json()
          message = data.error || message
        } catch {
          const text = await res.text()
          message = text || message
        }
        setErrors({ submit: message })
      }
    } catch {
      setErrors({ submit: 'Erro ao conectar ao servidor' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mensagem de verificação de email */}
      {verifyMessage && (
        <div className="p-3 rounded-lg text-sm" style={{
          background: verifyMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: verifyMessage.type === 'success' ? '#22c55e' : '#ef4444',
          border: `1px solid ${verifyMessage.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
          {verifyMessage.type === 'success' ? '✅' : '❌'} {verifyMessage.text}
        </div>
      )}

      {errors.submit && (
        <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {errors.submit}
        </div>
      )}

      {/* Email */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Email</label>
        <input type="email" value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="seu@email.com"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{ background: '#1c1f24', border: `1px solid ${errors.email ? '#ef4444' : '#2a2d34'}`, color: '#e8eaed' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = errors.email ? '#ef4444' : '#2a2d34' }}
        />
        {errors.email && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.email}</p>}
      </div>

      {/* Senha */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Senha</label>
        <input type="password" value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="••••••"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{ background: '#1c1f24', border: `1px solid ${errors.password ? '#ef4444' : '#2a2d34'}`, color: '#e8eaed' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = errors.password ? '#ef4444' : '#2a2d34' }}
        />
        {errors.password && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.password}</p>}
      </div>

      <button type="submit" disabled={isLoading}
        className="w-full py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer border-none"
        style={{ background: '#22c55e', color: '#0a1a10' }}
      >
        {isLoading ? 'Entrando...' : 'Entrar'}
      </button>

      <p className="text-center text-xs" style={{ color: '#6b7280' }}>
        Não tem conta?{' '}
        <Link href="/auth/register" className="font-medium hover:underline" style={{ color: '#22c55e' }}>
          Cadastre-se grátis
        </Link>
      </p>
    </form>
  )
}
