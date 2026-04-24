'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const email = searchParams.get('email') || ''

  useEffect(() => {
    // Se houver token na URL, já verifica automaticamente
    const token = searchParams.get('token')
    if (token) {
      verifyToken(token)
    }
  }, [])

  const verifyToken = async (token: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao verificar email')
      }
    } catch {
      setError('Erro ao conectar ao servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode) {
      setError('Digite o código de verificação')
      return
    }

    await verifyToken(verificationCode)
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-green-600">Email Verificado!</h2>
        <p className="text-gray-600">Redirecionando para login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-600">
          Um email de verificação foi enviado para: <strong>{email}</strong>
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Código de Verificação
        </label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => {
            setVerificationCode(e.target.value)
            setError('')
          }}
          placeholder="Cole o código do email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
        className="w-full"
      >
        Verificar Email
      </Button>

      <p className="text-center text-sm text-gray-600">
        Não recebeu o email?{' '}
        <Link href="#" className="text-blue-600 hover:underline">
          Reenviar código
        </Link>
      </p>
    </form>
  )
}