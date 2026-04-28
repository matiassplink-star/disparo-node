'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { User } from '@/types'
import { CheckCircle2, Zap, Users, Bot, Send, BarChart3, Activity } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState({ daysLeft: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await fetch('/api/auth/me')
        if (meRes.ok) {
          const userData = await meRes.json()
          setUser(userData)
          const days = userData.acesso_ate 
            ? Math.ceil((new Date(userData.acesso_ate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0
          setStats({ daysLeft: Math.max(0, days) })
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

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Visão Geral da Operação 🚀
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1 font-medium">
            Bem-vindo de volta, {user?.nome?.split(' ')[0]}. Acompanhe os números em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white dark:bg-[#16181c] border border-gray-200 dark:border-[#2a2d34] flex items-center gap-3 shadow-sm dark:shadow-xl dark:shadow-black/20">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-[10px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-widest">
              Plano {user?.plano} ({stats.daysLeft} dias)
            </span>
          </div>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPAIS (Inspirado na Landing Page) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Mensagens Enviadas', value: '12.487', color: 'text-[#22c55e]', icon: <Send size={18} /> },
          { label: 'Taxa de Entrega', value: '99.2%', color: 'text-cyan-500 dark:text-cyan-400', icon: <CheckCircle2 size={18} /> },
          { label: 'Taxa de Resposta', value: '34.8%', color: 'text-yellow-500 dark:text-yellow-400', icon: <Activity size={18} /> },
          { label: 'Leads Extraídos', value: '3.842', color: 'text-purple-500 dark:text-purple-400', icon: <Users size={18} /> },
        ].map((s, i) => (
          <div key={i} className="group bg-white dark:bg-[#16181c] border border-gray-200 dark:border-[#2a2d34] rounded-3xl p-5 hover:border-[#22c55e]/50 transition-all shadow-sm dark:shadow-xl dark:shadow-black/20 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-current opacity-[0.03] dark:opacity-5 rounded-full group-hover:scale-150 transition-transform duration-500" style={{ color: s.color.replace(/text-|dark:text-/g, '') }} />
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl bg-slate-50 dark:bg-white/5 ${s.color}`}>
                {s.icon}
              </div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-[#6b7280]">
                {s.label}
              </div>
            </div>
            <div className={`text-3xl font-black ${s.color}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA: PROGRESSO E ATALHOS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* BARRA DE PROGRESSO DE DISPARO */}
          <div className="bg-white dark:bg-[#16181c] border border-gray-200 dark:border-[#2a2d34] rounded-3xl p-6 shadow-sm dark:shadow-xl dark:shadow-black/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#22c55e] to-[#10b981]" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 flex items-center justify-center text-[#22c55e]">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Campanha em Andamento</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Oferta Black Friday 2025</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-[#22c55e]">68% Concluído</span>
                <p className="text-[10px] text-slate-500 dark:text-gray-500 mt-1">1.666 / 2.450 envios</p>
              </div>
            </div>
            
            <div className="h-2.5 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden mt-2">
              <div className="h-full w-[68%] bg-gradient-to-r from-[#22c55e] to-[#10b981] rounded-full relative">
                <div className="absolute inset-0 bg-white/20 animate-[shine_2s_infinite]" />
              </div>
            </div>
          </div>

          {/* ATALHOS RÁPIDOS */}
          <div>
            <h2 className="text-sm font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest px-1 mb-4">Acesso Rápido</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/dashboard/whatsapp/disparo" className="group p-5 rounded-3xl bg-white dark:bg-[#16181c] border border-gray-200 dark:border-[#2a2d34] hover:bg-slate-50 dark:hover:bg-[#1c1f24] hover:border-[#22c55e]/50 transition-all flex items-center gap-4 no-underline shadow-sm dark:shadow-none">
                <div className="w-12 h-12 rounded-2xl bg-[#22c55e]/10 flex items-center justify-center text-[#22c55e] group-hover:scale-110 transition-transform">
                  <Send size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Novo Disparo</p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-500">Criar campanha em massa</p>
                </div>
              </Link>
              
              <Link href="/dashboard/crm" className="group p-5 rounded-3xl bg-white dark:bg-[#16181c] border border-gray-200 dark:border-[#2a2d34] hover:bg-slate-50 dark:hover:bg-[#1c1f24] hover:border-blue-500/50 transition-all flex items-center gap-4 no-underline shadow-sm dark:shadow-none">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Atendimento (CRM)</p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-500">Visualizar conversas</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: LOGS E ATIVIDADE */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#16181c] border border-gray-200 dark:border-[#2a2d34] rounded-3xl p-6 shadow-sm dark:shadow-xl dark:shadow-black/20 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-[#22c55e]" /> Atividade em Tempo Real
              </h3>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]/80 animate-pulse" />
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {[
                { icon: <CheckCircle2 size={14}/>, text: 'Mensagem entregue → 3491****', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
                { icon: <CheckCircle2 size={14}/>, text: 'Mensagem entregue → 1198****', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
                { icon: <Zap size={14}/>, text: 'Rotação de chip (Instância 2) ativada', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                { icon: <Users size={14}/>, text: '312 leads extraídos do grupo B', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
                { icon: <Bot size={14}/>, text: 'IA reescreveu 20 variações de copy', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { icon: <CheckCircle2 size={14}/>, text: 'Sessão do WhatsApp iniciada com sucesso', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
              ].map((a, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 text-xs px-3 py-2.5 rounded-xl border border-slate-100 dark:border-white/5 ${a.bg} dark:bg-transparent dark:hover:bg-white/5 transition-colors`}
                >
                  <span className={a.color}>{a.icon}</span>
                  <span className="text-slate-700 dark:text-[#e8eaed] font-medium flex-1 truncate">{a.text}</span>
                  <span className="text-[9px] font-mono text-slate-400 dark:text-[#6b7280]">agora</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#2a2d34] text-center">
              <Link href="/dashboard/whatsapp" className="text-xs font-bold text-[#22c55e] hover:text-[#10b981] transition-colors">
                Ver Logs Completos →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
