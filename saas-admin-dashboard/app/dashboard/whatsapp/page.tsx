'use client'

import { useEffect, useState, useCallback } from 'react'
import { Smartphone, QrCode, Wifi, WifiOff, RefreshCw, LogOut } from 'lucide-react'
import Image from 'next/image'
import { User } from '@/types'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'loading'

export default function WhatsAppPage() {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('loading')
  const [phone, setPhone] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Buscar dados do usuário
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUser(data) })
  }, [])

  // Checar status da conexão
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status')
      if (!res.ok) {
        setStatus('disconnected')
        return
      }
      const data = await res.json()
      setStatus(data.status || 'disconnected')
      setPhone(data.phone || null)
      // Se conectou, limpar o QR
      if (data.status === 'connected') setQrCode(null)
    } catch {
      setStatus('disconnected')
    }
  }, [])

  useEffect(() => {
    checkStatus()
    // Polling a cada 5 segundos enquanto conectando
    const interval = setInterval(() => {
      if (status === 'connecting') checkStatus()
    }, 5000)
    return () => clearInterval(interval)
  }, [checkStatus, status])

  // Conectar / Gerar QR Code
  const handleConnect = async () => {
    setIsActionLoading(true)
    setQrCode(null)
    setStatus('connecting')
    try {
      const res = await fetch('/api/whatsapp/connect', { method: 'POST' })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao conectar')
      }

      if (data.qrcode) {
        setQrCode(data.qrcode)
      } else {
        setStatus(data.status || 'disconnected')
      }
    } catch (err: unknown) {
      console.error(err)
      alert((err as Error).message || 'Falha na conexão. Tente novamente.')
      setStatus('disconnected')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Desconectar
  const handleDisconnect = async () => {
    if (!confirm('Deseja desconectar o WhatsApp?')) return
    setIsActionLoading(true)
    try {
      await fetch('/api/whatsapp/disconnect', { method: 'POST' })
      setStatus('disconnected')
      setPhone(null)
      setQrCode(null)
    } finally {
      setIsActionLoading(false)
    }
  }

  const isAdmin = user?.plano === 'admin'
  const hasAccess = isAdmin || (user?.acesso_ate && new Date(user.acesso_ate) > new Date())

  if (!hasAccess && user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-md w-full bg-[#16181c] border border-[#2a2d34] rounded-3xl p-8 text-center">
          <span className="text-5xl">⏳</span>
          <h2 className="text-2xl font-black text-white mt-4 mb-2">Acesso Expirado</h2>
          <p className="text-gray-400 text-sm mb-6">Renove sua assinatura para continuar.</p>
          <a href="/dashboard/perfil" className="inline-block w-full py-3 bg-[#22c55e] text-[#0a1a10] rounded-xl font-bold text-sm no-underline">
            Ver Planos →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#22c55e]/10 rounded-xl flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-[#22c55e]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Conexão WhatsApp</h1>
          <p className="text-xs text-gray-400">Conecte seu número para usar as automações</p>
        </div>
      </div>

      {/* Card de Status */}
      <div className="bg-[#16181c] border border-[#2a2d34] rounded-2xl p-6">

        {/* Status atual */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {status === 'connected' ? (
              <Wifi className="w-5 h-5 text-[#22c55e]" />
            ) : status === 'connecting' ? (
              <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />
            ) : (
              <WifiOff className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <p className="text-sm font-bold text-white">
                {status === 'connected' ? 'Conectado' :
                  status === 'connecting' ? 'Aguardando QR Code...' :
                  status === 'loading' ? 'Verificando...' :
                  'Desconectado'}
              </p>
              {phone && (
                <p className="text-xs text-gray-400">+{phone}</p>
              )}
            </div>
          </div>

          {/* Bolinha de status */}
          <div className={`w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-[#22c55e] animate-pulse' :
            status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            'bg-gray-600'
          }`} />
        </div>

        {/* QR Code */}
        {qrCode && status === 'connecting' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <Image
                src={qrCode}
                alt="QR Code WhatsApp"
                width={220}
                height={220}
                unoptimized
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Escaneie com seu celular</p>
              <p className="text-xs text-gray-400 mt-1">
                Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo
              </p>
            </div>
            <button
              onClick={checkStatus}
              className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Verificar conexão
            </button>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-3 mt-2">
          {status !== 'connected' ? (
            <button
              onClick={handleConnect}
              disabled={isActionLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#22c55e] text-[#0a1a10] rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
            >
              {isActionLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4" />
              )}
              {qrCode ? 'Novo QR Code' : 'Conectar WhatsApp'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={isActionLoading}
              className="flex items-center gap-2 px-4 py-3 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-all hover:bg-red-500/10 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Desconectar
            </button>
          )}
        </div>
      </div>

      {/* Instruções */}
      {status === 'disconnected' && !qrCode && (
        <div className="bg-[#16181c] border border-[#2a2d34] rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Como conectar</p>
          {[
            'Clique em "Conectar WhatsApp" acima',
            'Abra o WhatsApp no seu celular',
            'Vá em Configurações → Dispositivos Conectados',
            'Toque em "Conectar Dispositivo" e escaneie o QR'
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 bg-[#22c55e]/10 text-[#22c55e] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </span>
              <p className="text-sm text-gray-300">{step}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
