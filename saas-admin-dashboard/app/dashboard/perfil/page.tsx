'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User } from '@/types'
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react'

// Inicializa o MP
const pk = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || ''
if (pk) initMercadoPago(pk, { locale: 'pt-BR' })

export default function PerfilPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Checkout states
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'semestral' | 'anual' | null>(null)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [isGeneratingPref, setIsGeneratingPref] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) router.push('/auth/login')
        else {
          setUser(data)
          setAvatarUrl(data.avatar_url || '')
        }
        setIsLoading(false)
      })
  }, [router])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSaving(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/users/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        setAvatarUrl(data.url)
        setUser({ ...user, avatar_url: data.url })
        alert('Foto atualizada com sucesso!')
      } else {
        alert(data.error || 'Erro ao subir foto')
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setIsSaving(false)
    }
  }

  const gerarPreference = async (plano: 'mensal' | 'semestral' | 'anual') => {
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
    } catch {
      alert('Erro de conexão ao gerar checkout')
    } finally {
      setIsGeneratingPref(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505]">
        <div className="animate-spin h-10 w-10 border-4 border-[#22c55e] border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!user) return null;

  const dataValidade = user.acesso_ate ? new Date(user.acesso_ate).toLocaleDateString('pt-BR') : 'Ilimitado'
  const planoNome = user.plano === 'admin' ? 'Administrador' : user.plano || 'Grátis'

  // Gamificação - Badges
  const getBadge = (u: User | null) => {
    if (u?.plano === 'admin') return { icon: '👑', name: 'Criador Mestre', color: 'from-yellow-400 to-amber-600', shadow: 'shadow-amber-500/40' }

    // Calcula os dias totais de acesso para identificar planos manuais
    let diasAcesso = 0;
    try {
      if (u?.acesso_ate && u?.created_at) {
        const d1 = new Date(u.acesso_ate).getTime();
        const d2 = new Date(u.created_at).getTime();
        if (!isNaN(d1) && !isNaN(d2)) {
          diasAcesso = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
        }
      } else if (u?.acesso_ate) {
        const d1 = new Date(u.acesso_ate).getTime();
        if (!isNaN(d1)) {
          diasAcesso = Math.round((d1 - Date.now()) / (1000 * 60 * 60 * 24));
        }
      }
    } catch {
      diasAcesso = 0;
    }

    const p = String(u?.plano || '').toLowerCase();
    if (p.includes('anual') || p.includes('general') || diasAcesso >= 300) {
      return { icon: '💎', name: 'General das Vendas', color: 'from-cyan-300 to-blue-600', shadow: 'shadow-blue-500/40' }
    }
    if (p.includes('semestral') || p.includes('comandante') || diasAcesso >= 150) {
      return { icon: '🥇', name: 'Comandante de Escala', color: 'from-yellow-300 to-yellow-600', shadow: 'shadow-yellow-500/40' }
    }
    if (p.includes('mensal') || p.includes('soldado') || diasAcesso >= 20) {
      return { icon: '🥈', name: 'Soldado do Disparo', color: 'from-gray-300 to-gray-500', shadow: 'shadow-gray-500/40' }
    }

    return { icon: '🥉', name: 'Recruta Iniciante', color: 'from-orange-300 to-orange-600', shadow: 'shadow-orange-500/40' }
  }
  const badge = getBadge(user)

  return (
    <div className="min-h-screen bg-[#050505] text-[#e8eaed] p-6 lg:p-12 relative overflow-hidden flex flex-col">
      {/* Efeito Aurora */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[#22c55e] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[60vh] bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-pulse delay-1000 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto w-full z-10 space-y-6 flex-1 flex flex-col">

        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard/whatsapp" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#6b7280] hover:text-[#e8eaed] hover:bg-white/10 transition-all backdrop-blur-md">
            ←
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight">Meu Perfil</h1>
        </div>

        {/* Emblema de Autoridade (Gamificação) */}
        <div className={`p-[1px] rounded-2xl bg-gradient-to-r ${badge.color} mb-6`}>
          <div className="bg-[#16181c]/90 backdrop-blur-xl rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className={`w-20 h-20 flex-shrink-0 flex items-center justify-center text-4xl bg-gradient-to-br ${badge.color} rounded-full shadow-lg ${badge.shadow} transform hover:scale-110 transition-transform duration-300 cursor-default`}>
              {badge.icon}
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs font-mono uppercase tracking-widest text-[#6b7280] mb-1">Patente Atual</p>
              <h2 className={`text-2xl font-bold bg-gradient-to-r ${badge.color} bg-clip-text text-transparent`}>{badge.name}</h2>
              <p className="text-sm text-[#8b949e] mt-1">
                {user?.plano === 'free' ? 'Faça upgrade para evoluir de patente e dobrar suas conversões!' : 'Você é parte da elite do ZapLink.'}
              </p>
            </div>
            {user?.plano === 'free' && (
              <div className="ml-auto mt-4 sm:mt-0">
                <button
                  onClick={() => setShowCheckout(true)}
                  className="px-6 py-2 bg-gradient-to-r from-[#22c55e] to-[#10b981] text-[#0a1a10] rounded-xl font-bold hover:brightness-110 shadow-lg shadow-green-500/30 transition-all cursor-pointer"
                >
                  Evoluir Patente
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Dados Pessoais */}
          <div className="bg-[#16181c]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <span className="text-[#22c55e]">👤</span> Dados da Conta
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-[#6b7280] mb-3 font-mono uppercase tracking-widest">Foto de Perfil</label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                      {avatarUrl ? <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">👤</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{avatarUrl ? 'Foto personalizada' : 'Nenhuma foto'}</p>
                      <p className="text-[10px] text-[#6b7280]">JPG, PNG ou GIF (Máx. 5MB)</p>
                    </div>
                  </div>
                  
                  <label className="relative cursor-pointer group">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={isSaving}
                    />
                    <div className="w-full py-3 bg-[#22c55e]/10 hover:bg-[#22c55e]/20 text-[#22c55e] rounded-xl text-xs font-bold transition-all border border-[#22c55e]/20 flex items-center justify-center gap-2 group-active:scale-95">
                      {isSaving ? (
                        <>
                          <div className="animate-spin h-3 w-3 border-2 border-[#22c55e] border-t-transparent rounded-full"></div>
                          Processando...
                        </>
                      ) : (
                        <>📁 {avatarUrl ? 'Trocar Foto' : 'Selecionar Foto'}</>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Dados do Plano */}
          <div className="bg-[#16181c]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <span className="text-yellow-400">⭐</span> Seu Plano
            </h2>

            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center px-5 py-4 bg-white/5 rounded-xl border border-white/5">
                <span className="text-xs font-bold text-[#6b7280] font-mono uppercase tracking-wider">Assinatura</span>
                <span className="text-sm font-bold capitalize text-[#22c55e] drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">{planoNome}</span>
              </div>

              {user.plano !== 'admin' && (
                <div className="flex justify-between items-center px-5 py-4 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-xs font-bold text-[#6b7280] font-mono uppercase tracking-wider">Válido até</span>
                  <span className="text-sm font-bold text-orange-400">{dataValidade}</span>
                </div>
              )}

              {user.plano !== 'admin' && (
                <div className="mt-auto pt-6">
                  <button
                    onClick={() => setShowCheckout(!showCheckout)}
                    className="w-full py-4 bg-gradient-to-r from-[#22c55e] to-[#10b981] text-[#0a1a10] rounded-xl font-extrabold hover:brightness-110 shadow-lg shadow-green-500/30 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Renovar / Fazer Upgrade ⚡
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal/Section de Checkout */}
        {showCheckout && (
          <div className="mt-8 bg-[#16181c]/90 backdrop-blur-xl border border-[#22c55e]/30 rounded-3xl p-6 lg:p-10 shadow-2xl shadow-[#22c55e]/10 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#22c55e]/10 rounded-full filter blur-[80px] pointer-events-none"></div>

            <h2 className="text-2xl font-extrabold mb-8 text-center bg-gradient-to-r from-[#22c55e] to-[#3b82f6] bg-clip-text text-transparent">Evolua seu Nível no ZapLink</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
              {[
                { id: 'mensal', name: 'Plano Empreendedor', badge: 'Mensal', price: 'R$ 49,90' },
                { id: 'semestral', name: 'Máquina de Vendas', badge: 'Semestral (17% OFF)', price: 'R$ 247,90', highlight: true },
                { id: 'anual', name: 'Dominador de Mercado', badge: 'Anual (33% OFF)', price: 'R$ 397,90' },
              ].map(p => (
                <div
                  key={p.id}
                  onClick={() => gerarPreference(p.id as 'mensal' | 'semestral' | 'anual')}                  className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${selectedPlan === p.id
                      ? 'border-[#22c55e] bg-[#22c55e]/10 transform scale-105 shadow-xl shadow-green-500/20'
                      : 'border-white/10 hover:border-white/30 bg-black/40 hover:bg-black/60'
                    }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0a1a10] text-[10px] font-extrabold px-3 py-1 rounded-full shadow-lg shadow-orange-500/40">
                      MAIS VENDIDO 🔥
                    </div>
                  )}
                  <div className="text-center mt-2">
                    <div className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider mb-2">{p.badge}</div>
                    <h3 className="font-bold text-white mb-2 leading-tight">{p.name}</h3>
                    <span className="text-2xl font-black text-[#22c55e]">{p.price}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-black/50 rounded-2xl p-6 border border-white/5 min-h-[120px] flex items-center justify-center backdrop-blur-md">
              {!selectedPlan ? (
                <p className="text-[#8b949e] font-medium text-center">Selecione uma das opções acima para desbloquear as Estratégias VIP e o limite ilimitado.</p>
              ) : isGeneratingPref ? (
                <div className="flex flex-col items-center gap-4 text-[#e8eaed] font-medium">
                  <div className="animate-spin h-8 w-8 border-4 border-[#22c55e] border-t-transparent rounded-full drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  Gerando link seguro...
                </div>
              ) : preferenceId && pk ? (
                <div className="w-full max-w-md mx-auto text-center animate-fade-in" id="checkout-container">
                  <div className="inline-flex items-center gap-2 bg-[#22c55e]/20 text-[#22c55e] px-4 py-2 rounded-full text-xs font-bold mb-6">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
                    Ambiente 100% Seguro
                  </div>
                  {/* @ts-expect-error — Wallet types incomplete in current SDK version */}
                  <Wallet initialization={{ preferenceId, redirectMode: 'self' }} />
                </div>
              ) : (
                <p className="text-orange-400 text-sm">O Mercado Pago não está configurado.</p>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
