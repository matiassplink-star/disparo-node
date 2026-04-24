'use client'

import { useEffect, useState } from 'react'
import { User } from '@/types'
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

// Inicializa o MP com a chave pública.
const pk = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || ''
if (pk) initMercadoPago(pk, { locale: 'pt-BR' })

export default function WhatsAppPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [iframeToken, setIframeToken] = useState<string | null>(null)
  
  // Checkout
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'semestral' | 'anual' | null>(null)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [isGeneratingPref, setIsGeneratingPref] = useState(false)

  const DISPARO_URL = process.env.NEXT_PUBLIC_WA_SERVER_URL || 'http://localhost:3001'
  const waLink = 'https://wa.me/5534999929764?text=Olá!%20Quero%20ativar%20meu%20acesso%20ao%20sistema%20ZapLink.'

  const router = useRouter()
  const searchParams = useSearchParams()
  const panel = searchParams.get('panel')

  const [iframeHeight, setIframeHeight] = useState('calc(100vh - 160px)')

  // Token e Dados Iniciais
  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await fetch('/api/auth/me')
        if (userRes.ok) {
          const data = await userRes.json()
          setUser(data)
        }

        const tokenRes = await fetch('/api/auth/iframe-token')
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json()
          if (tokenData.iframeToken) setIframeToken(tokenData.iframeToken)
        }
      } catch { /* ignora */ }

      try {
        await fetch(DISPARO_URL, { mode: 'no-cors' })
        setIsLoading(false)
      } catch {
        setHasError(true)
        setIsLoading(false)
      }
    }
    init()

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.action === 'navigate' && event.data.url) {
        router.push(event.data.url)
      }
      if (event.data?.action === 'setHeight' && event.data.height) {
        setIframeHeight(`${event.data.height}px`)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [router, DISPARO_URL])

  // Lógica de Troca de Painel via URL (com cache buster para garantir atualizações)
  const [sessionVersion] = useState(Date.now().toString())
  const iframeUrl = iframeToken ? `${DISPARO_URL}?token=${iframeToken}&v=${sessionVersion}` : ''

  useEffect(() => {
    const activePanel = panel || 'dashboard'
    if (iframeUrl) {
      // Envio imediato para maior responsividade
      const iframe = document.querySelector('iframe')
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ action: 'changePanel', panel: activePanel }, '*')
      }
      
      // Backup para garantir carregamento inicial lento
      const timer = setTimeout(() => {
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ action: 'changePanel', panel: activePanel }, '*')
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [panel, iframeUrl])

  const handleSelectPlan = async (plano: 'mensal' | 'semestral' | 'anual') => {
    setSelectedPlan(plano)
    setPreferenceId(null)
    setIsGeneratingPref(true)
    
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano })
      })
      const data = await res.json()
      if (res.ok && data.preferenceId) {
        setPreferenceId(data.preferenceId)
      } else {
        alert(data.error || 'Erro ao gerar checkout')
      }
    } catch (error) {
      alert('Erro de conexão ao gerar checkout')
    } finally {
      setIsGeneratingPref(false)
    }
  }

  const isAdmin = user?.plano === 'admin'
  const acessoAtivo = isAdmin || (user?.acesso_ate && new Date(user.acesso_ate) > new Date())

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 h-[400px]`}>
        <div className="animate-spin h-10 w-10 border-4 border-[#22c55e] border-t-transparent rounded-full"></div>
        <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">Iniciando ZapLink...</p>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 p-12 text-center`}>
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-bold text-white">Servidor Offline</h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          O motor de automação (backend) não está respondendo.
          <br />
          Execute <code className="bg-gray-800 px-2 py-1 rounded text-xs font-mono text-green-400">node server.js</code> para iniciar.
        </p>
        <button onClick={() => window.location.reload()} className="mt-4 px-8 py-2 bg-[#22c55e] text-[#0a1a10] rounded-xl font-bold">Tentar Novamente</button>
      </div>
    )
  }

  if (!acessoAtivo || showCheckout) {
    const dataExpiracao = user?.acesso_ate ? new Date(user.acesso_ate).toLocaleDateString('pt-BR') : null
    return (
      <div className="flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-[#16181c] border border-[#2a2d34] rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⏳</span>
            </div>
            {acessoAtivo && (
              <button onClick={() => setShowCheckout(false)} className="mb-6 text-xs font-bold px-4 py-2 rounded-xl border border-[#2a2d34] text-[#9ca3af] hover:text-[#e8eaed] hover:bg-[#2a2d34] transition-all">
                ← Voltar ao painel
              </button>
            )}
            <h2 className="text-2xl font-black text-[#e8eaed] mb-2 uppercase">
              {acessoAtivo ? 'Renovar Assinatura' : 'Acesso Expirado'}
            </h2>
            <p className="text-gray-500 text-sm mb-8">Escolha um dos planos abaixo para liberar todas as ferramentas de automação.</p>
            <div className="bg-[#0e0f11] rounded-2xl p-6 border border-[#2a2d34]">
              {/* Aqui o Brick de pagamento */}
              {/* @ts-ignore */}
              <Wallet initialization={{ preferenceId: preferenceId || '', redirectMode: 'self' }} />
              <a href={waLink} target="_blank" className="inline-block w-full py-3 bg-[#22c55e] text-[#0a1a10] rounded-xl font-bold text-sm mt-4 no-underline">Pagar via WhatsApp 💬</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const diasRestantes = user?.acesso_ate
    ? Math.ceil((new Date(user.acesso_ate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="flex flex-col w-full">
      {!isAdmin && user?.plano !== 'pro' && user?.plano !== 'premium' && diasRestantes !== null && (
        <div className={`flex items-center justify-center gap-6 px-6 py-3 text-[11px] font-bold border-b transition-all ${
          diasRestantes <= 3 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
        }`}>
          <div>{diasRestantes <= 3 ? '⚠️' : '✅'} Acesso: {new Date(user!.acesso_ate!).toLocaleDateString('pt-BR')} ({diasRestantes} dias)</div>
          <button onClick={() => setShowCheckout(true)} className="px-4 py-1 bg-[#22c55e] text-[#0a1a10] rounded-lg font-black uppercase">Fazer Upgrade ⚡</button>
        </div>
      )}
      <div className="flex-1 w-full overflow-visible">
        {iframeToken ? (
          <iframe
            src={iframeUrl}
            title="ZapLink Automation"
            className="w-full border-0 transition-all duration-300"
            style={{ height: iframeHeight, minHeight: 'calc(100vh - 52px)' }}
            allow="clipboard-read; clipboard-write"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-xs font-mono uppercase tracking-widest text-[#6b7280]">Gerando sessão segura...</div>
        )}
      </div>
    </div>
  )
}
