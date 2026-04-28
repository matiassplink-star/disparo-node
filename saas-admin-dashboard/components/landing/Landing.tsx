'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// ============================================================================
// DADOS
// ============================================================================

const plans = [
  {
    id: 'soldado',
    emoji: '🥈',
    name: 'Soldado do Disparo',
    subtitle: 'Para quem está começando a escalar',
    price: '49,90',
    originalPrice: null as string | null,
    period: '/mês',
    breakdown: 'R$ 1,66 por dia',
    savings: null as string | null,
    cycle: 'Mensal · Renova todo mês',
    features: [
      { text: 'Disparos Ilimitados', included: true, premium: false },
      { text: '2 Conexões WhatsApp', included: true, premium: false },
      { text: 'Envio para Grupos', included: true, premium: false },
      { text: 'Limpeza de Lista (Filtro WA)', included: true, premium: false },
      { text: 'Rotação Anti-Ban', included: true, premium: false },
      { text: 'Extração de Membros', included: true, premium: false },
      { text: 'Gestor de Proxies', included: false, premium: false },
      { text: 'IA Reescrita Humana', included: false, premium: true },
    ],
    badge: null as string | null,
    badgeColor: '',
    highlight: false,
    cta: 'Começar no Mensal',
    link: '/auth/register?plan=mensal',
  },
  {
    id: 'comandante',
    emoji: '🥇',
    name: 'Comandante de Escala',
    subtitle: 'O equilíbrio entre economia e poder',
    price: '247,90',
    originalPrice: '299,40',
    period: '/6 meses',
    breakdown: 'equivale a R$ 41,32/mês',
    savings: 'Você economiza R$ 51,50',
    cycle: 'Semestral · Pagamento único',
    features: [
      { text: 'Disparos Ilimitados', included: true, premium: false },
      { text: '5 Conexões WhatsApp', included: true, premium: false },
      { text: 'Gestor de Proxies (Pool)', included: true, premium: true },
      { text: 'Limpeza de Lista (Filtro WA)', included: true, premium: false },
      { text: 'Envio para Grupos', included: true, premium: false },
      { text: 'Rotação Anti-Ban', included: true, premium: false },
      { text: 'IA ChatGPT (Beta)', included: true, premium: true },
      { text: 'IA Reescrita Humana', included: false, premium: true },
    ],
    badge: 'MAIS POPULAR',
    badgeColor: 'from-yellow-400 to-orange-500',
    highlight: true,
    cta: 'Escolher Semestral',
    link: '/auth/register?plan=semestral',
  },
  {
    id: 'general',
    emoji: '💎',
    name: 'General das Vendas',
    subtitle: 'Domínio total da operação',
    price: '397,90',
    originalPrice: '598,80',
    period: '/ano',
    breakdown: 'equivale a R$ 33,16/mês',
    savings: 'Você economiza R$ 200,90',
    cycle: 'Anual · Pagamento único',
    features: [
      { text: 'Disparos Ilimitados', included: true, premium: false },
      { text: 'Conexões Ilimitadas', included: true, premium: true },
      { text: 'Gestor de Proxies (Pool)', included: true, premium: true },
      { text: 'Limpeza de Lista (Filtro WA)', included: true, premium: false },
      { text: 'IA Reescrita Humana', included: true, premium: true },
      { text: 'Suporte Prioritário (VIP)', included: true, premium: true },
      { text: 'Acesso a Todas as Betas', included: true, premium: true },
      { text: 'Consultoria de Escala (1h)', included: true, premium: true },
    ],
    badge: 'MELHOR CUSTO',
    badgeColor: 'from-cyan-400 to-blue-500',
    highlight: false,
    cta: 'Dominar o Mercado',
    link: '/auth/register?plan=anual',
  },
]

const stats = [
  { value: 47, suffix: 'M+', label: 'Mensagens enviadas', decimals: 0 },
  { value: 3400, suffix: '+', label: 'Operadores ativos', decimals: 0 },
  { value: 99.2, suffix: '%', label: 'Taxa de entrega', decimals: 1 },
  { value: 4.9, suffix: '/5', label: 'Avaliação média', decimals: 1 },
]

const howSteps = [
  {
    number: '01',
    icon: '📱',
    title: 'Conecte',
    desc: 'Escaneie o QR Code e pareie até 5 chips em segundos. Sem cabos, sem emulador.',
    color: 'from-green-400 to-emerald-600',
  },
  {
    number: '02',
    icon: '🎯',
    title: 'Extraia',
    desc: 'Colete milhares de leads de grupos, listas e contatos. Filtre números ativos com 1 clique.',
    color: 'from-yellow-400 to-orange-500',
  },
  {
    number: '03',
    icon: '🚀',
    title: 'Dispare',
    desc: 'Rotação anti-ban, delays humanos e IA reescrevendo cada mensagem. Você só acompanha.',
    color: 'from-cyan-400 to-blue-600',
  },
]

const features = [
  { icon: '🧹', title: 'Limpeza de Lista', desc: 'Filtre números válidos que possuem WhatsApp ativo (9º dígito) antes de disparar.' },
  { icon: '👥', title: 'Extração de Grupos', desc: 'Capture milhares de leads qualificados de qualquer grupo em segundos.' },
  { icon: '🔄', title: 'Rotação Inteligente', desc: 'Alterna entre múltiplos chips automaticamente para diluir o volume de envios.' },
  { icon: '🤖', title: 'IA (ChatGPT)', desc: 'Respostas e reescrita de mensagens para parecerem 100% humanas.' },
  { icon: '▶️', title: 'Envio para Grupos', desc: 'Dispare suas ofertas em massa para centenas de grupos simultaneamente.' },
  { icon: '⏱️', title: 'Delays Reais', desc: 'Simulação de digitação e pausas aleatórias que imitam o comportamento humano.' },
  { icon: '📊', title: 'Monitor Full', desc: 'Acompanhe envios, falhas e métricas em tempo real com relatórios detalhados.' },
  { icon: '🛡️', title: 'Proteção LGPD', desc: 'Sistema em conformidade com as leis de privacidade e segurança de dados.' },
]

const testimonials = [
  {
    name: 'Rafael Moura',
    role: 'Infoprodutor · Nicho Finanças',
    rating: 5,
    text: 'Em 45 dias recuperei o investimento de 1 ano. A rotação anti-ban é o que faltava — zerei os bans.',
    result: '+R$ 47k em 60 dias',
    color: 'from-green-400 to-emerald-600',
  },
  {
    name: 'Juliana Farias',
    role: 'Coach de Carreira',
    rating: 5,
    text: 'Dispara 8 mil mensagens por dia sem dor de cabeça. O filtro WA me economiza 4 horas de trabalho.',
    result: '3.2k leads/semana',
    color: 'from-cyan-400 to-blue-500',
  },
  {
    name: 'Daniel Chen',
    role: 'Agência de Tráfego',
    rating: 5,
    text: 'Atendo 12 clientes na mesma dashboard. A IA reescrevendo cada mensagem salva nossos chips.',
    result: '12 operações ativas',
    color: 'from-yellow-400 to-orange-500',
  },
  {
    name: 'Camila Rocha',
    role: 'E-commerce · Moda',
    rating: 5,
    text: 'Recuperação de carrinho automática e disparos de promoção aumentaram meu faturamento em 3x.',
    result: '3x no faturamento',
    color: 'from-pink-400 to-rose-600',
  },
  {
    name: 'Marco Silveira',
    role: 'Afiliado · 6 em 7',
    rating: 5,
    text: 'Testei os 3 maiores do mercado. O ZapLink é o único que não travou no volume que eu faço.',
    result: '14k envios/dia',
    color: 'from-orange-400 to-red-500',
  },
  {
    name: 'Leandro Ávila',
    role: 'Imobiliária · Curitiba',
    rating: 5,
    text: 'A extração de grupos me dá leads quentes todo dia. Meu time vende enquanto eu durmo.',
    result: '24 vendas/mês',
    color: 'from-blue-400 to-indigo-600',
  },
]

type CompareCell = boolean | string

const comparison: { feature: string; zaplink: CompareCell; concA: CompareCell; concB: CompareCell }[] = [
  { feature: 'Disparos Ilimitados', zaplink: true, concA: true, concB: false },
  { feature: 'Rotação Anti-Ban Automática', zaplink: true, concA: false, concB: false },
  { feature: 'Gestor de Proxies Integrado', zaplink: true, concA: false, concB: false },
  { feature: 'IA Reescrita Humana', zaplink: true, concA: false, concB: true },
  { feature: 'Extração de Grupos', zaplink: true, concA: true, concB: true },
  { feature: 'Filtro WA (9º dígito)', zaplink: true, concA: false, concB: false },
  { feature: 'Funciona em Windows/Mac/Linux', zaplink: true, concA: false, concB: false },
  { feature: 'Suporte em Português 24h', zaplink: true, concA: false, concB: false },
  { feature: 'Preço mensal a partir de', zaplink: 'R$ 49,90', concA: 'R$ 97,00', concB: 'R$ 149,00' },
]

const faqs = [
  {
    q: 'Minha conta pode ser banida?',
    a: 'O ZapLink usa rotação automática entre chips, delays humanizados e IA reescrevendo cada mensagem para minimizar riscos. Recomendamos sempre usar chips dedicados (não seu pessoal) e seguir as diretrizes. Nenhuma ferramenta no mercado garante 100% de segurança — inclusive o próprio WhatsApp oficial bane contas que fazem spam.',
  },
  {
    q: 'Quantos chips preciso para começar?',
    a: 'No plano Soldado você pode conectar 2 chips simultâneos. No Comandante, 5. No General, ilimitados. Para operações pequenas (até 500 disparos/dia), 1 chip já funciona bem.',
  },
  {
    q: 'Tem contrato de fidelidade?',
    a: 'Não. Você pode cancelar quando quiser direto pelo painel. Os planos semestral e anual são pagos uma única vez — sem renovação automática surpresa.',
  },
  {
    q: 'Aceita Pix? Tem desconto?',
    a: 'Sim, aceitamos Pix, cartão (em até 12x) e boleto via Mercado Pago. Pagamentos à vista no Pix ou boleto têm 5% de desconto extra no plano anual.',
  },
  {
    q: 'Funciona no Mac ou Linux?',
    a: 'Sim. O ZapLink roda 100% no navegador (Chrome, Firefox, Safari, Edge) — não precisa instalar nada. Funciona em Windows, macOS, Linux e inclusive celular (modo limitado).',
  },
  {
    q: 'Como é o suporte?',
    a: 'No plano Soldado você tem suporte por e-mail em até 24h. No Comandante e General, suporte prioritário no WhatsApp direto com nossa equipe técnica, tempo médio de resposta de 15 minutos em horário comercial.',
  },
  {
    q: 'Posso testar antes de pagar?',
    a: 'Sim! O plano Recruta te dá 3 dias grátis com 50 disparos por dia, sem pedir cartão. Se quiser mais volume, todos os planos pagos têm 7 dias de garantia incondicional — não gostou, devolvemos 100%.',
  },
  {
    q: 'A IA reescreve mensagens de verdade?',
    a: 'Sim. Usamos GPT-4 para gerar 20+ variações únicas de cada mensagem que você escreve, alterando estrutura, sinônimos e tom — cada contato recebe uma versão levemente diferente, o que reduz drasticamente o risco de bloqueio por repetição.',
  },
]

const typewriterWords = ['Disparos em Massa', 'IA Reescrevendo', 'Anti-Ban Rotativo', 'Extração de Grupos']

const WA_LINK = 'https://wa.me/5534999929764?text=Olá!%20Quero%20saber%20mais%20sobre%20o%20ZapLink.'

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function Landing() {
  return (
    <div className="min-h-screen text-[#e8eaed] relative overflow-hidden bg-[#050505]">
      <ScrollProgress />
      <AuroraBackground />
      <div className="relative z-10">
        <Header />
        <Hero />
        <StatsBar />
        <HowItWorks />
        <FeaturesSection />
        <ProductDemo />
        <Testimonials />
        <Comparison />
        <Pricing />
        <Guarantee />
        <FAQSection />
        <FinalCTA />
        <Footer />
        <WhatsAppFloat />
      </div>
    </div>
  )
}

// ============================================================================
// SCROLL PROGRESS BAR
// ============================================================================

function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handler = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      const current = window.scrollY
      setProgress(total > 0 ? (current / total) * 100 : 0)
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-[100] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-[#22c55e] via-[#10b981] to-[#3b82f6] transition-[width] duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

// ============================================================================
// AURORA BACKGROUND
// ============================================================================

function AuroraBackground() {
  return (
    <>
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-[#22c55e] rounded-full mix-blend-screen filter blur-[140px] opacity-15 animate-pulse pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[-5%] w-[40vw] h-[50vh] bg-[#8b5cf6] rounded-full mix-blend-screen filter blur-[140px] opacity-10 animate-pulse delay-500 pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[70vh] bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[140px] opacity-15 animate-pulse delay-1000 pointer-events-none z-0" />
    </>
  )
}

// ============================================================================
// HEADER
// ============================================================================

function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full animate-pulse bg-[#22c55e] shadow-[0_0_15px_#22c55e]" />
          <span className="text-2xl md:text-3xl font-black tracking-[0.2em] font-mono text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            ZAPLINK
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-[#8b949e]">
          <a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a>
          <a href="#features" className="hover:text-white transition-colors">Recursos</a>
          <a href="#depoimentos" className="hover:text-white transition-colors">Depoimentos</a>
          <a href="#planos" className="hover:text-white transition-colors">Planos</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="hidden sm:inline text-sm font-medium text-[#8b949e] hover:text-white transition-colors">
            Entrar
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-bold bg-gradient-to-r from-[#22c55e] to-[#10b981] text-[#0a1a10] shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:brightness-110 hover:scale-105 transition-all"
          >
            Criar Conta Grátis
          </Link>
        </div>
      </div>
    </header>
  )
}

// ============================================================================
// HERO
// ============================================================================

function Hero() {
  const [wordIndex, setWordIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = typewriterWords[wordIndex]
    const speed = isDeleting ? 40 : 90
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        const next = currentWord.slice(0, displayText.length + 1)
        setDisplayText(next)
        if (next === currentWord) {
          setTimeout(() => setIsDeleting(true), 1800)
        }
      } else {
        const next = currentWord.slice(0, displayText.length - 1)
        setDisplayText(next)
        if (next === '') {
          setIsDeleting(false)
          setWordIndex((i) => (i + 1) % typewriterWords.length)
        }
      }
    }, speed)
    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, wordIndex])

  return (
    <section className="container mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-20">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-8 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            +3.400 operadores ativos agora
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.05] text-white tracking-tight">
            Venda no automático com
            <br />
            <span className="bg-gradient-to-r from-[#22c55e] to-[#3b82f6] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(34,197,94,0.3)] inline-block min-h-[1.2em]">
              {displayText}
              <span className="inline-block w-[3px] h-[0.9em] bg-[#22c55e] ml-1 align-middle animate-pulse" />
            </span>
          </h1>

          <p className="text-base md:text-xl max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed text-[#8b949e]">
            A solução completa para escala: Rotação Anti-Ban, Inteligência Artificial, Extração de Grupos e{' '}
            <strong className="text-white">Gestor de Proxies Automático</strong>.
          </p>

          <div className="flex gap-3 justify-center lg:justify-start flex-wrap">
            <Link
              href="/auth/register"
              className="group px-8 py-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-[#22c55e] to-[#10b981] text-[#0a1a10] shadow-[0_10px_30px_rgba(34,197,94,0.3)] hover:scale-105 hover:shadow-[0_15px_40px_rgba(34,197,94,0.5)] transition-all"
            >
              Quero Começar Agora
              <span className="inline-block ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-2xl font-bold text-sm border border-white/10 text-[#8b949e] bg-white/5 hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm"
            >
              Falar no WhatsApp
            </a>
          </div>

          <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-xs text-[#6b7280]">
            <div className="flex items-center gap-2">
              <span className="text-[#22c55e]">✓</span> 3 dias grátis
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#22c55e]">✓</span> Sem cartão
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#22c55e]">✓</span> Cancele quando quiser
            </div>
          </div>
        </div>

        <DashboardMockup />
      </div>
    </section>
  )
}

function DashboardMockup() {
  return (
    <div className="relative mx-auto max-w-xl lg:max-w-none w-full">
      {/* Glow atrás */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e]/20 to-[#3b82f6]/20 rounded-3xl blur-2xl" />

      {/* Frame navegador */}
      <div className="relative bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden transform lg:rotate-1 hover:rotate-0 transition-transform duration-500">
        {/* Barra do navegador */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#16181c] border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="ml-4 flex-1 bg-black/40 rounded-md px-3 py-1 text-[10px] font-mono text-[#6b7280]">
            zaplink.com/dashboard
          </div>
        </div>

        {/* Conteúdo do mockup */}
        <div className="p-5 space-y-4 bg-gradient-to-br from-[#050505] to-[#0a0a0a]">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Enviadas', value: '12.487', color: 'text-[#22c55e]' },
              { label: 'Entregues', value: '99.2%', color: 'text-cyan-400' },
              { label: 'Respostas', value: '847', color: 'text-yellow-400' },
            ].map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-2.5">
                <div className="text-[8px] uppercase text-[#6b7280] font-bold tracking-wider">{s.label}</div>
                <div className={`text-lg font-black mt-0.5 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Barra de progresso de disparo */}
          <div className="bg-white/5 border border-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-white">Disparo #247 em andamento</span>
              <span className="text-[10px] font-mono text-[#22c55e]">68%</span>
            </div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div className="h-full w-[68%] bg-gradient-to-r from-[#22c55e] to-[#10b981] rounded-full animate-pulse" />
            </div>
          </div>

          {/* Lista de atividade */}
          <div className="space-y-1.5">
            {[
              { icon: '✓', text: 'Mensagem entregue → 3491****', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' },
              { icon: '⚡', text: 'Rotação de chip ativada', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
              { icon: '👥', text: '312 leads extraídos do grupo', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
              { icon: '🤖', text: 'IA reescreveu 20 variações', color: 'text-purple-400', bg: 'bg-purple-400/10' },
            ].map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-[10px] px-2.5 py-1.5 rounded-md ${a.bg} border border-white/5`}
              >
                <span className={a.color}>{a.icon}</span>
                <span className="text-[#e8eaed] font-medium">{a.text}</span>
                <span className="ml-auto text-[8px] font-mono text-[#6b7280]">agora</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notificações flutuantes */}
      <div className="hidden md:block absolute -top-6 -right-6 bg-[#16181c] border border-[#22c55e]/30 rounded-xl px-4 py-3 shadow-2xl shadow-green-500/10 animate-float">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
            <span className="text-[#22c55e]">✓</span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white">+1 venda</div>
            <div className="text-[9px] text-[#8b949e]">R$ 397 · Plano Anual</div>
          </div>
        </div>
      </div>

      <div className="hidden md:block absolute -bottom-4 -left-6 bg-[#16181c] border border-cyan-500/30 rounded-xl px-4 py-3 shadow-2xl shadow-blue-500/10 animate-float-delayed">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400">📬</span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white">Nova resposta</div>
            <div className="text-[9px] text-[#8b949e]">&quot;Tenho interesse!&quot;</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STATS BAR (números animados)
// ============================================================================

function StatsBar() {
  return (
    <section className="container mx-auto px-6 py-8 md:py-12">
      <div className="rounded-3xl bg-[#16181c]/50 backdrop-blur-xl border border-white/5 py-8 px-4 md:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-5xl font-black bg-gradient-to-br from-white to-[#22c55e] bg-clip-text text-transparent">
                <CountUp value={s.value} decimals={s.decimals} />
                {s.suffix}
              </div>
              <div className="text-[10px] md:text-xs uppercase tracking-widest text-[#6b7280] font-bold mt-2">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const duration = 1500
          const start = performance.now()
          const animate = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(value * eased)
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <span ref={ref}>
      {count.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  )
}

// ============================================================================
// COMO FUNCIONA
// ============================================================================

function HowItWorks() {
  return (
    <section id="como-funciona" className="container mx-auto px-6 py-20 md:py-28">
      <div className="text-center mb-16">
        <div className="inline-block text-xs font-mono uppercase tracking-widest text-[#22c55e] font-bold mb-3">
          Em 3 passos simples
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
          Do QR Code à primeira <span className="text-[#22c55e]">venda</span> em minutos
        </h2>
        <p className="text-[#8b949e] max-w-2xl mx-auto">Nada de configuração infernal. Conecte seu WhatsApp e comece a operar hoje mesmo.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto relative">
        {/* Linha tracejada desktop */}
        <div className="hidden md:block absolute top-24 left-[16%] right-[16%] h-[1px] border-t-2 border-dashed border-white/10" />

        {howSteps.map((step, i) => (
          <div
            key={i}
            className="relative bg-[#16181c]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-8 hover:border-[#22c55e]/30 hover:-translate-y-2 transition-all group"
          >
            {/* Número enorme atrás */}
            <div className="absolute top-4 right-4 text-6xl font-black text-white/[0.03] select-none pointer-events-none">
              {step.number}
            </div>

            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-3xl shadow-lg mb-5 relative z-10 group-hover:scale-110 transition-transform`}
            >
              {step.icon}
            </div>

            <div className="text-xs font-mono text-[#22c55e] font-bold mb-2">PASSO {step.number}</div>
            <h3 className="text-2xl font-extrabold text-white mb-3">{step.title}</h3>
            <p className="text-sm text-[#8b949e] leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// FEATURES (grid de 8)
// ============================================================================

function FeaturesSection() {
  return (
    <section id="features" className="container mx-auto px-6 py-20 md:py-24">
      <div className="text-center mb-16">
        <div className="inline-block text-xs font-mono uppercase tracking-widest text-[#22c55e] font-bold mb-3">
          Arsenal completo
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
          A arma secreta das <span className="text-[#22c55e]">grandes operações</span>
        </h2>
        <p className="text-[#8b949e] max-w-2xl mx-auto">Nós cuidamos da tecnologia, você foca em vender.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
        {features.map((f, i) => (
          <SpotlightCard key={i}>
            <div className="text-3xl md:text-4xl mb-4 md:mb-6 bg-gradient-to-br from-[#22c55e]/20 to-transparent w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border border-white/5">
              {f.icon}
            </div>
            <h3 className="text-base md:text-lg font-bold mb-2 md:mb-3 text-white">{f.title}</h3>
            <p className="text-xs md:text-sm leading-relaxed text-[#8b949e]">{f.desc}</p>
          </SpotlightCard>
        ))}
      </div>
    </section>
  )
}

function SpotlightCard({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
    card.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="relative rounded-3xl p-5 md:p-8 transition-all hover:-translate-y-2 group cursor-default bg-[#16181c]/60 backdrop-blur-xl border border-white/5 hover:border-[#22c55e]/30 shadow-2xl overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(400px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(34,197,94,0.08), transparent 40%)',
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// PRODUCT DEMO (tabs com telas falsas)
// ============================================================================

function ProductDemo() {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = [
    { name: 'Disparos', icon: '🚀' },
    { name: 'Extração', icon: '👥' },
    { name: 'CRM', icon: '💬' },
    { name: 'Métricas', icon: '📊' },
  ]

  return (
    <section className="container mx-auto px-6 py-20 md:py-24">
      <div className="text-center mb-12">
        <div className="inline-block text-xs font-mono uppercase tracking-widest text-[#22c55e] font-bold mb-3">
          Veja em ação
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
          Uma dashboard, <span className="bg-gradient-to-r from-[#22c55e] to-cyan-400 bg-clip-text text-transparent">controle total</span>
        </h2>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-4 md:px-6 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all ${
                activeTab === i
                  ? 'bg-[#22c55e] text-[#0a1a10] shadow-lg shadow-green-500/30'
                  : 'bg-white/5 text-[#8b949e] hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.name}
            </button>
          ))}
        </div>

        {/* Frame */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e]/20 via-transparent to-[#3b82f6]/20 rounded-3xl blur-3xl" />

          <div className="relative bg-[#0a0a0a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#16181c] border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="ml-4 text-xs font-mono text-[#6b7280]">zaplink.com/dashboard/{tabs[activeTab].name.toLowerCase()}</div>
            </div>

            <div className="p-6 md:p-10 min-h-[380px]">
              <DemoContent tab={activeTab} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DemoContent({ tab }: { tab: number }) {
  if (tab === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl md:text-2xl font-bold text-white">Campanha em execução</div>
            <div className="text-xs text-[#8b949e]">Black Friday 2025 · 2.450 contatos</div>
          </div>
          <div className="px-3 py-1 bg-[#22c55e]/20 border border-[#22c55e]/30 rounded-full text-[10px] font-bold text-[#22c55e]">
            ● AO VIVO
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { l: 'Fila', v: '784', c: 'text-white' },
            { l: 'Enviadas', v: '1.246', c: 'text-[#22c55e]' },
            { l: 'Entregues', v: '1.234', c: 'text-cyan-400' },
            { l: 'Falhas', v: '12', c: 'text-red-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3">
              <div className="text-[9px] uppercase font-bold text-[#6b7280] tracking-wider">{s.l}</div>
              <div className={`text-2xl font-black mt-1 ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">Progresso da campanha</span>
            <span className="text-xs font-mono text-[#22c55e]">50.9%</span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full w-[50%] bg-gradient-to-r from-[#22c55e] to-[#10b981] rounded-full" />
          </div>
          <div className="flex justify-between text-[10px] text-[#6b7280] mt-2">
            <span>ETA: 23 min</span>
            <span>Velocidade: 52 msg/min</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[10px]">
          {['Chip 1 · 3491****', 'Chip 2 · 1199****', 'Chip 3 · 4785****'].map((c, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-2 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-white font-mono">{c}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tab === 1) {
    return (
      <div className="space-y-4">
        <div>
          <div className="text-xl md:text-2xl font-bold text-white">Extração de Grupos</div>
          <div className="text-xs text-[#8b949e]">3.247 leads únicos coletados</div>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔗</span>
            <span className="text-sm font-mono text-white truncate">chat.whatsapp.com/KZXvQ8L...</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8b949e]">Membros encontrados: <span className="text-white font-bold">847</span></span>
            <span className="text-[#22c55e] font-bold">● extraindo...</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-square bg-white/5 border border-white/5 rounded-md flex items-center justify-center text-[10px] font-mono text-[#6b7280]">
              +55 {Math.floor(Math.random() * 99)}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-[#22c55e]">✓</span>
            <span className="text-white">Filtro WA ativo — 94% válidos</span>
          </div>
          <button className="px-4 py-2 bg-[#22c55e] text-[#0a1a10] rounded-lg font-bold text-xs">Exportar CSV</button>
        </div>
      </div>
    )
  }

  if (tab === 2) {
    return (
      <div className="grid grid-cols-[180px_1fr] gap-4 h-[320px]">
        <div className="bg-white/5 border border-white/5 rounded-xl p-2 space-y-1 overflow-hidden">
          <div className="text-[9px] uppercase font-bold text-[#6b7280] tracking-wider px-2 py-1">Conversas</div>
          {[
            { n: 'João Silva', m: 'Quero saber sobre o plano...', t: '2m', unread: 2 },
            { n: 'Maria Costa', m: 'Obrigada!', t: '14m', unread: 0 },
            { n: 'Carlos Souza', m: 'Você tem em estoque?', t: '1h', unread: 1 },
            { n: 'Ana Beatriz', m: 'Vou pensar', t: '3h', unread: 0 },
          ].map((c, i) => (
            <div key={i} className={`p-2 rounded-lg cursor-pointer ${i === 0 ? 'bg-[#22c55e]/10 border border-[#22c55e]/20' : 'hover:bg-white/5'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white truncate">{c.n}</span>
                {c.unread > 0 && <span className="text-[8px] bg-[#22c55e] text-[#0a1a10] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">{c.unread}</span>}
              </div>
              <div className="text-[9px] text-[#8b949e] truncate mt-0.5">{c.m}</div>
              <div className="text-[8px] text-[#6b7280] mt-0.5">{c.t}</div>
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col">
          <div className="border-b border-white/5 pb-2 mb-3">
            <div className="text-xs font-bold text-white">João Silva</div>
            <div className="text-[9px] text-[#22c55e]">● online</div>
          </div>
          <div className="flex-1 space-y-2 overflow-hidden">
            <div className="flex">
              <div className="bg-white/10 rounded-2xl rounded-tl-sm px-3 py-1.5 text-[10px] text-white max-w-[80%]">
                Oi! Vi seu anúncio sobre o curso.
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-[#22c55e]/80 text-[#0a1a10] rounded-2xl rounded-tr-sm px-3 py-1.5 text-[10px] font-medium max-w-[80%]">
                Olá João! Claro, posso te enviar o material?
              </div>
            </div>
            <div className="flex">
              <div className="bg-white/10 rounded-2xl rounded-tl-sm px-3 py-1.5 text-[10px] text-white max-w-[80%]">
                Quero saber sobre o plano premium
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
            <div className="flex-1 bg-black/40 rounded-full px-3 py-1.5 text-[10px] text-[#6b7280]">Digite uma mensagem...</div>
            <button className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center text-[#0a1a10]">→</button>
          </div>
        </div>
      </div>
    )
  }

  // tab 3 — métricas
  const bars = [40, 65, 45, 80, 60, 90, 75, 95, 70, 88, 72, 98]
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl md:text-2xl font-bold text-white">Métricas em tempo real</div>
        <div className="text-xs text-[#8b949e]">Últimos 12 dias · Desempenho por canal</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'Taxa de entrega', v: '99.2%', d: '↑ 2.1%', c: 'text-[#22c55e]' },
          { l: 'Taxa de resposta', v: '18.4%', d: '↑ 5.3%', c: 'text-cyan-400' },
          { l: 'Conversão', v: '4.7%', d: '↑ 1.2%', c: 'text-yellow-400' },
        ].map((m, i) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3">
            <div className="text-[9px] uppercase font-bold text-[#6b7280] tracking-wider">{m.l}</div>
            <div className={`text-2xl font-black mt-1 ${m.c}`}>{m.v}</div>
            <div className="text-[9px] text-[#22c55e] font-bold mt-0.5">{m.d} vs última semana</div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/5 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">Disparos por dia</div>
        <div className="flex items-end gap-2 h-32">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-gradient-to-t from-[#22c55e] to-[#10b981] rounded-t"
                style={{ height: `${h}%` }}
              />
              <div className="text-[8px] text-[#6b7280] font-mono">{i + 1}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TESTIMONIALS
// ============================================================================

function Testimonials() {
  return (
    <section id="depoimentos" className="container mx-auto px-6 py-20 md:py-28">
      <div className="text-center mb-14">
        <div className="inline-block text-xs font-mono uppercase tracking-widest text-[#22c55e] font-bold mb-3">
          Prova real · Operadores reais
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
          Resultados que <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">falam sozinhos</span>
        </h2>
        <p className="text-[#8b949e] max-w-2xl mx-auto">Mais de 3.400 operadores usam o ZapLink todo dia para escalar suas vendas.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className="relative bg-[#16181c]/60 backdrop-blur-xl border border-white/5 hover:border-white/20 rounded-3xl p-6 hover:-translate-y-1 transition-all group"
          >
            {/* Aspas decorativas */}
            <div className="absolute top-4 right-5 text-6xl font-serif text-white/5 leading-none select-none pointer-events-none">&ldquo;</div>

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                {t.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{t.name}</div>
                <div className="text-[10px] text-[#8b949e]">{t.role}</div>
              </div>
            </div>

            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: t.rating }).map((_, j) => (
                <span key={j} className="text-yellow-400 text-sm">★</span>
              ))}
            </div>

            <p className="text-sm text-[#e8eaed] leading-relaxed italic mb-4">&ldquo;{t.text}&rdquo;</p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/5 font-mono">
              <span className="text-[9px] text-[#6b7280] font-bold uppercase tracking-wider">Resultado</span>
              <span className={`text-xs font-black bg-gradient-to-r ${t.color} bg-clip-text text-transparent`}>{t.result}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// COMPARISON
// ============================================================================

function Comparison() {
  return (
    <section className="container mx-auto px-6 py-20 md:py-24">
      <div className="text-center mb-12">
        <div className="inline-block text-xs font-mono uppercase tracking-widest text-[#22c55e] font-bold mb-3">
          Por que escolher
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
          ZapLink vs <span className="text-red-400">concorrência</span>
        </h2>
        <p className="text-[#8b949e] max-w-2xl mx-auto">Comparativo honesto com os 2 principais concorrentes do mercado.</p>
      </div>

      <div className="max-w-5xl mx-auto bg-[#16181c]/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr] text-center">
          {/* Header */}
          <div className="bg-black/40 px-3 md:px-6 py-5 text-left text-[10px] md:text-xs font-bold uppercase tracking-wider text-[#6b7280]">
            Recurso
          </div>
          <div className="bg-gradient-to-b from-[#22c55e]/20 to-transparent border-x border-[#22c55e]/30 px-2 md:px-6 py-5">
            <div className="text-xs md:text-sm font-black text-[#22c55e]">ZAPLINK</div>
            <div className="text-[9px] text-[#22c55e]/60 mt-0.5">Recomendado</div>
          </div>
          <div className="bg-black/40 px-2 md:px-6 py-5">
            <div className="text-xs md:text-sm font-bold text-[#8b949e]">Concorrente A</div>
          </div>
          <div className="bg-black/40 px-2 md:px-6 py-5">
            <div className="text-xs md:text-sm font-bold text-[#8b949e]">Concorrente B</div>
          </div>

          {/* Rows */}
          {comparison.map((row, i) => (
            <div key={i} className="contents">
              <div className={`px-3 md:px-6 py-3 md:py-4 text-left text-[11px] md:text-sm text-white font-medium border-t border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                {row.feature}
              </div>
              <div className={`px-2 md:px-6 py-3 md:py-4 border-x border-[#22c55e]/20 border-t border-[#22c55e]/10 ${i % 2 === 0 ? 'bg-[#22c55e]/[0.04]' : ''}`}>
                <CompareCell value={row.zaplink} positive />
              </div>
              <div className={`px-2 md:px-6 py-3 md:py-4 border-t border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                <CompareCell value={row.concA} />
              </div>
              <div className={`px-2 md:px-6 py-3 md:py-4 border-t border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                <CompareCell value={row.concB} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CompareCell({ value, positive = false }: { value: CompareCell; positive?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${positive ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-white/5 text-[#22c55e]'} font-bold`}>
        ✓
      </span>
    ) : (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500/10 text-red-400/70 font-bold">✕</span>
    )
  }
  return <span className={`text-[11px] md:text-sm font-bold ${positive ? 'text-[#22c55e]' : 'text-[#8b949e]'}`}>{value}</span>
}

// ============================================================================
// PRICING (planos repaginados)
// ============================================================================

function Pricing() {
  return (
    <section id="planos" className="container mx-auto px-6 py-20 md:py-28">
      <div className="text-center mb-14">
        <div className="inline-block text-xs font-mono uppercase tracking-widest text-[#22c55e] font-bold mb-3">
          Planos e preços
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
          Planos que <span className="bg-gradient-to-r from-[#22c55e] to-[#3b82f6] bg-clip-text text-transparent">cabem no seu momento</span>
        </h2>
        <p className="text-[#8b949e] max-w-2xl mx-auto">Comece com 3 dias grátis, sem cartão. Faça upgrade quando precisar de mais poder de fogo.</p>
      </div>

      {/* 3 planos principais */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
        {plans.map((plan, i) => (
          <div
            key={i}
            className={`relative rounded-3xl p-8 transition-all duration-300 flex flex-col ${
              plan.highlight
                ? 'bg-[#16181c]/90 backdrop-blur-2xl border-2 border-[#22c55e] md:scale-105 shadow-[0_0_50px_rgba(34,197,94,0.2)] z-10'
                : 'bg-[#16181c]/60 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:-translate-y-1'
            }`}
          >
            {plan.badge && (
              <div
                className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r ${plan.badgeColor} text-[#0a1a10] shadow-lg whitespace-nowrap`}
              >
                {plan.badge}
              </div>
            )}

            <div className="text-center mb-6">
              <div className="text-4xl mb-3">{plan.emoji}</div>
              <h3 className="text-xl font-extrabold text-white mb-1">{plan.name}</h3>
              <p className="text-xs text-[#8b949e]">{plan.subtitle}</p>
            </div>

            <div className="border-y border-white/5 py-5 mb-5">
              {plan.originalPrice && (
                <div className="text-center text-xs text-[#6b7280] line-through mb-1">
                  de R$ {plan.originalPrice}
                </div>
              )}
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-xs text-[#8b949e] font-bold">R$</span>
                <span className={`text-5xl font-black ${plan.highlight ? 'text-[#22c55e]' : 'text-white'}`}>{plan.price}</span>
                <span className="text-xs text-[#8b949e] font-bold">{plan.period}</span>
              </div>
              <div className="text-center text-[11px] text-[#8b949e] mt-2 font-mono">{plan.breakdown}</div>
              {plan.savings && (
                <div className="text-center mt-3">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[10px] font-bold text-[#22c55e]">
                    {plan.savings}
                  </span>
                </div>
              )}
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              {plan.features.map((f, j) => (
                <li key={j} className={`flex items-start gap-2.5 text-sm ${f.included ? 'text-[#e8eaed]' : 'text-[#4b5563] line-through'}`}>
                  <span className="mt-0.5 flex-shrink-0">
                    {f.included ? (
                      f.premium ? (
                        <span className="text-yellow-400">⚡</span>
                      ) : (
                        <span className="text-[#22c55e]">✓</span>
                      )
                    ) : (
                      <span className="text-[#4b5563]">✕</span>
                    )}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>

            <Link
              href={plan.link}
              className={`block w-full text-center py-4 rounded-xl font-bold text-sm transition-all ${
                plan.highlight
                  ? 'bg-gradient-to-r from-[#22c55e] to-[#10b981] text-[#0a1a10] shadow-lg shadow-green-500/30 hover:brightness-110 hover:scale-[1.02]'
                  : 'bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {plan.cta}
            </Link>

            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#6b7280]">
                <span>🔒</span>
                <span>Cancele quando quiser</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-[10px] text-[#6b7280]">
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 font-mono">Pix</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 font-mono">Cartão</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 font-mono">Boleto</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recruta grátis como banner horizontal */}
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-[#16181c]/40 backdrop-blur-xl border border-dashed border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 md:gap-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="text-4xl">🥉</div>
            <div>
              <div className="text-sm font-bold text-white">
                Prefere testar antes? <span className="text-[#22c55e]">Recruta Iniciante</span>
              </div>
              <div className="text-xs text-[#8b949e] mt-0.5">3 dias grátis · 50 disparos/dia · 1 conexão · Sem cartão</div>
            </div>
          </div>
          <Link
            href="/auth/register"
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 text-sm font-bold transition-all whitespace-nowrap"
          >
            Ativar teste grátis →
          </Link>
        </div>
      </div>

      {/* Selos de confiança */}
      <div className="max-w-4xl mx-auto mt-12 flex flex-wrap items-center justify-center gap-6 md:gap-10 text-[#6b7280]">
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-[#22c55e] text-lg">🛡️</span>
          <span>7 dias de garantia</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-[#22c55e] text-lg">🔒</span>
          <span>Pagamento seguro</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-[#22c55e] text-lg">⚡</span>
          <span>Ativação imediata</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-[#22c55e] text-lg">💬</span>
          <span>Suporte em PT-BR</span>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// GUARANTEE (selo gigante)
// ============================================================================

function Guarantee() {
  return (
    <section className="container mx-auto px-6 py-20 md:py-28">
      <div className="relative max-w-4xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-yellow-500/10 rounded-3xl blur-3xl" />

        <div className="relative bg-gradient-to-br from-[#16181c]/90 to-[#0a0a0a]/90 backdrop-blur-2xl border border-yellow-500/20 rounded-3xl p-8 md:p-14 text-center overflow-hidden">
          {/* Brilho animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/5 to-transparent animate-shine pointer-events-none" />

          {/* Selo */}
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full blur-2xl opacity-50" />
            <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-600 flex flex-col items-center justify-center shadow-2xl shadow-orange-500/30 border-4 border-yellow-300/20">
              <div className="text-5xl md:text-6xl">🛡️</div>
              <div className="text-[10px] md:text-xs font-black text-[#0a1a10] uppercase tracking-widest mt-1">7 dias</div>
            </div>
          </div>

          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Garantia <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Incondicional</span>
          </h2>

          <p className="text-base md:text-lg text-[#8b949e] max-w-2xl mx-auto leading-relaxed">
            Teste o ZapLink por 7 dias. Se por qualquer motivo não ficar satisfeito,
            <span className="text-white font-bold"> devolvemos 100% do valor</span> — sem perguntas, sem burocracia, sem drama.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-[#6b7280]">
            <div>✓ Estorno em até 5 dias úteis</div>
            <div>✓ Sem letras miúdas</div>
            <div>✓ Decisão sua, total</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// FAQ
// ============================================================================

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="container mx-auto px-6 py-20 md:py-24">
      <div className="text-center mb-14">
        <div className="inline-block text-xs font-mono uppercase tracking-widest text-[#22c55e] font-bold mb-3">
          Dúvidas frequentes
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
          Tudo que você precisa <span className="text-[#22c55e]">saber</span>
        </h2>
        <p className="text-[#8b949e] max-w-2xl mx-auto">Se ficar com qualquer outra dúvida, é só chamar no WhatsApp — respondemos em minutos.</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i
          return (
            <div
              key={i}
              className={`bg-[#16181c]/60 backdrop-blur-xl border rounded-2xl transition-all ${
                isOpen ? 'border-[#22c55e]/40 shadow-[0_0_30px_rgba(34,197,94,0.05)]' : 'border-white/5 hover:border-white/10'
              }`}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 cursor-pointer"
              >
                <span className={`text-sm md:text-base font-bold transition-colors ${isOpen ? 'text-[#22c55e]' : 'text-white'}`}>
                  {faq.q}
                </span>
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isOpen ? 'bg-[#22c55e] text-[#0a1a10] rotate-45' : 'bg-white/5 text-[#8b949e]'
                  }`}
                >
                  +
                </span>
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-5 text-sm text-[#8b949e] leading-relaxed">{faq.a}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ============================================================================
// FINAL CTA com contador
// ============================================================================

function FinalCTA() {
  return (
    <section className="container mx-auto px-6 py-20 md:py-28">
      <div className="relative max-w-6xl mx-auto rounded-[2rem] overflow-hidden">
        {/* Background gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e] via-[#10b981] to-[#3b82f6]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.3),transparent_60%)]" />

        {/* Grid decorativo */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative p-8 md:p-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black mb-6 bg-black/30 text-white backdrop-blur-sm border border-white/20">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            OFERTA TERMINA EM
          </div>

          <CountdownTimer />

          <h2 className="text-3xl md:text-6xl font-black text-white mb-4 mt-6 leading-tight drop-shadow-lg">
            Chega de perder venda
            <br />
            por falta de <span className="underline decoration-yellow-300 decoration-4 underline-offset-4">tempo</span>
          </h2>

          <p className="text-base md:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed">
            Junte-se aos 3.400+ operadores que estão escalando suas vendas todo dia com o ZapLink.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/register"
              className="px-10 py-5 rounded-2xl font-black text-base md:text-lg bg-[#0a0a0a] text-white hover:bg-black transition-all hover:scale-105 shadow-2xl"
            >
              Começar Grátis Agora →
            </Link>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 rounded-2xl font-bold text-base md:text-lg bg-white/10 backdrop-blur-sm text-white border-2 border-white/20 hover:bg-white/20 transition-all"
            >
              Falar com Humano
            </a>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-white/80 font-medium">
            <div className="flex items-center gap-1.5">✓ 3 dias grátis</div>
            <div className="flex items-center gap-1.5">✓ Sem cartão de crédito</div>
            <div className="flex items-center gap-1.5">✓ Ativação em 2 minutos</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CountdownTimer() {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0)
      const diff = end.getTime() - now.getTime()
      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const units = [
    { label: 'Dias', value: time.days },
    { label: 'Horas', value: time.hours },
    { label: 'Min', value: time.minutes },
    { label: 'Seg', value: time.seconds },
  ]

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4">
      {units.map((u, i) => (
        <div key={i} className="flex items-center gap-2 md:gap-4">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl md:text-4xl font-black text-white font-mono tabular-nums">
                {String(u.value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-[9px] md:text-xs text-white/70 font-bold uppercase tracking-widest mt-2">{u.label}</span>
          </div>
          {i < units.length - 1 && <span className="text-xl md:text-3xl font-black text-white/40">:</span>}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// FOOTER
// ============================================================================

function Footer() {
  return (
    <footer className="py-16 mt-12 border-t border-white/5 bg-[#050505]/80 backdrop-blur-md">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 items-center text-center md:text-left mb-12">
          <div className="space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_12px_#22c55e]" />
              <span className="text-lg font-bold tracking-widest font-mono text-white">ZAPLINK</span>
            </div>
            <p className="text-xs text-[#8b949e] leading-relaxed max-w-xs mx-auto md:mx-0">
              ZapLink — CNPJ 32.657.200/0001-08
              <br />
              Acelerando suas vendas no WhatsApp desde 2019.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center gap-6">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2 border border-white/10">
                  <span className="text-xl">💳</span>
                </div>
                <span className="text-[10px] font-bold text-[#8b949e]">PAGAMENTO SEGURO</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2 border border-white/10">
                  <span className="text-xl">🛡️</span>
                </div>
                <span className="text-[10px] font-bold text-[#8b949e]">7 DIAS GARANTIA</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-center md:justify-end gap-6 text-[11px] font-bold text-[#8b949e]">
              <Link href="/privacy" className="hover:text-white transition-colors">POLÍTICA DE PRIVACIDADE</Link>
              <Link href="/terms" className="hover:text-white transition-colors">TERMOS DE USO (LGPD)</Link>
            </div>
            <p className="text-[10px] text-red-500/60 font-medium md:text-right">
              DISCLAIMER: Não nos responsabilizamos por números banidos.
              <br />
              O uso da ferramenta deve seguir as diretrizes do WhatsApp.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-[#4b5563] font-medium tracking-widest uppercase">
            © {new Date().getFullYear()} ZapLink — Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ============================================================================
// WHATSAPP FLOAT
// ============================================================================

function WhatsAppFloat() {
  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 z-50 bg-[#22c55e] shadow-[0_4px_20px_rgba(34,197,94,0.3)]"
      title="Falar no WhatsApp"
    >
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#0a1a10]">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  )
}
