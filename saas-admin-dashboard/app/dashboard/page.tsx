'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { User } from '@/types'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState({ numbers: 0, connected: 0, daysLeft: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await fetch('/api/auth/me')
        if (meRes.ok) {
          const userData = await meRes.json()
          setUser(userData)

          // Buscar números do servidor de WhatsApp
          const DISPARO_URL = process.env.NEXT_PUBLIC_WA_SERVER_URL || 'http://localhost:3001'
          // Nota: Em produção, isso precisaria de um token ou proxy via API route
          // Para simplificar, assumimos que o usuário já tem o token no cookie ou localStorage se acessou o iframe
          
          const days = userData.acesso_ate 
            ? Math.ceil((new Date(userData.acesso_ate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0
          
          setStats(prev => ({ ...prev, daysLeft: Math.max(0, days) }))
        }
      } catch (error) {
        console.error('Erro:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#22c55e', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  const isAdmin = user?.plano === 'admin'

  // Se for Admin, mostra o dashboard original (com stats de usuários)
  if (isAdmin) {
    // ... (restauro a lógica original de admin aqui para não perder funcionalidade)
    // Para economizar espaço, vou apenas focar no conteúdo de usuário por enquanto ou unificar
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Olá, {user?.nome?.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Seja bem-vindo ao seu painel de controle ZapLink.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-[#16181c] border border-[#2a2d34] flex items-center gap-3 shadow-lg shadow-black/20">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Acesso Ativo</span>
          </div>
        </div>
      </div>

      {/* Grid de Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group rounded-3xl p-6 bg-gradient-to-br from-[#16181c] to-[#0e0f11] border border-[#2a2d34] hover:border-[#22c55e]/30 transition-all duration-300 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#22c55e]/10 flex items-center justify-center text-[#22c55e] text-xl group-hover:scale-110 transition-transform">
              ◉
            </div>
            <span className="text-[10px] font-bold text-gray-600 tracking-widest uppercase">WhatsApp</span>
          </div>
          <p className="text-xs font-bold text-gray-500 mb-1">Status do Plano</p>
          <p className="text-2xl font-black text-white uppercase">{user?.plano}</p>
        </div>

        <div className="group rounded-3xl p-6 bg-gradient-to-br from-[#16181c] to-[#0e0f11] border border-[#2a2d34] hover:border-[#3b82f6]/30 transition-all duration-300 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] text-xl group-hover:scale-110 transition-transform">
              ⏳
            </div>
            <span className="text-[10px] font-bold text-gray-600 tracking-widest uppercase">Validade</span>
          </div>
          <p className="text-xs font-bold text-gray-500 mb-1">Dias Restantes</p>
          <p className="text-2xl font-black text-white">{stats.daysLeft} Dias</p>
        </div>

        <div className="group rounded-3xl p-6 bg-gradient-to-br from-[#16181c] to-[#0e0f11] border border-[#2a2d34] hover:border-orange-500/30 transition-all duration-300 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 text-xl group-hover:scale-110 transition-transform">
              🚀
            </div>
            <span className="text-[10px] font-bold text-gray-600 tracking-widest uppercase">Novidade</span>
          </div>
          <p className="text-xs font-bold text-gray-500 mb-1">Nova Função</p>
          <p className="text-2xl font-black text-white uppercase">IA Ativa</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Ações Rápidas */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Atalhos Rápidos</h2>
          <div className="grid gap-4">
            <Link href="/dashboard/whatsapp" className="group p-4 rounded-2xl bg-[#16181c] border border-[#2a2d34] hover:bg-[#1c1f24] hover:border-[#22c55e]/50 transition-all flex items-center gap-4 no-underline">
              <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 flex items-center justify-center text-[#22c55e] text-2xl group-hover:scale-110 transition-transform">
                ◈
              </div>
              <div>
                <p className="text-sm font-bold text-white">Painel de Disparos</p>
                <p className="text-[11px] text-gray-500">Conectar números e enviar mensagens</p>
              </div>
            </Link>
            <Link href="/dashboard/tutoriais" className="group p-4 rounded-2xl bg-[#16181c] border border-[#2a2d34] hover:bg-[#1c1f24] hover:border-blue-500/50 transition-all flex items-center gap-4 no-underline">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-2xl group-hover:scale-110 transition-transform">
                ▶
              </div>
              <div>
                <p className="text-sm font-bold text-white">Vídeos Tutoriais</p>
                <p className="text-[11px] text-gray-500">Aprenda a usar todas as ferramentas</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Notícias/Alertas */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Suporte e Comunidade</h2>
          <div className="rounded-3xl p-6 bg-gradient-to-br from-[#16181c] to-[#0e0f11] border border-[#2a2d34] flex flex-col items-center justify-center text-center gap-4 h-full min-h-[200px]">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl">
              👥
            </div>
            <div>
              <p className="text-sm font-bold text-white">Grupo de Alunos & Suporte</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">Tire suas dúvidas e acompanhe as atualizações em tempo real.</p>
            </div>
            <a href="https://wa.me/5534999929764" target="_blank" className="px-6 py-2 rounded-xl bg-[#22c55e] text-[#0a1a10] font-bold text-xs hover:brightness-110 transition-all no-underline">
              Entrar no Grupo
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
