// Landing Page - Server Component for SEO and Performance

import Link from 'next/link'

const plans = [
  {
    name: '🥉 Recruta Iniciante',
    price: '0,00',
    period: '/3 dias',
    features: [
      { text: '50 Disparos por dia', included: true },
      { text: '1 Conexão WhatsApp', included: true },
      { text: 'Extração de Membros', included: true },
      { text: 'Limpeza de Lista (Filtro WA)', included: true },
      { text: 'Dashboard de Métricas', included: true },
      { text: 'Envio para Grupos', included: false },
      { text: 'Gestor de Proxies', included: false },
    ],
    highlight: false,
    cta: 'Testar Agora',
    link: '/auth/register'
  },
  {
    name: '🥈 Soldado do Disparo',
    price: '49,90',
    period: '/mês',
    features: [
      { text: 'Disparos Ilimitados', included: true },
      { text: '2 Conexões WhatsApp', included: true },
      { text: 'Envio para Grupos', included: true },
      { text: 'Limpeza de Lista (Filtro WA)', included: true },
      { text: 'Rotação Anti-Ban', included: true },
      { text: 'Extração de Membros', included: true },
      { text: 'Gestor de Proxies', included: false },
    ],
    highlight: false,
    cta: 'Assinar Mensal',
    link: '/auth/register'
  },
  {
    name: '🥇 Comandante de Escala',
    price: '247,90',
    period: '/6 meses',
    originalPrice: '299,40',
    badge: 'O MAIS POPULAR 📈',
    features: [
      { text: 'Disparos Ilimitados', included: true },
      { text: '5 Conexões WhatsApp', included: true },
      { text: 'Gestor de Proxies (Pool)', included: true },
      { text: 'Limpeza de Lista (Filtro WA)', included: true },
      { text: 'Envio para Grupos', included: true },
      { text: 'Rotação Anti-Ban', included: true },
      { text: 'IA ChatGPT (Beta)', included: true },
    ],
    highlight: false,
    cta: 'Desbloquear VIP',
    link: '/auth/register'
  },
  {
    name: '💎 General das Vendas',
    price: '397,90',
    period: '/ano',
    originalPrice: '598,80',
    badge: 'MELHOR ESCOLHA - RECOMENDADO 🔥',
    pulsing: true,
    features: [
      { text: 'Disparos Ilimitados', included: true },
      { text: 'Conexões Ilimitadas', included: true },
      { text: 'Gestor de Proxies (Pool)', included: true },
      { text: 'Limpeza de Lista (Filtro WA)', included: true },
      { text: 'I.A. Reescrita Humana', included: true },
      { text: 'Suporte Prioritário', included: true },
      { text: 'Acesso a Todas as Betas', included: true },
    ],
    highlight: true,
    cta: 'Assinar Anual (Foco Total)',
    link: '/auth/register'
  },
]

export default function Home() {
  const waLink = 'https://wa.me/5534999929764?text=Olá!%20Quero%20saber%20mais%20sobre%20o%20ZapLink.'

  return (
    <div className="min-h-screen text-[#e8eaed] relative overflow-hidden bg-[#050505]">
      {/* Efeito Aurora Global */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-[#22c55e] rounded-full mix-blend-screen filter blur-[140px] opacity-15 animate-pulse pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[70vh] bg-[#8b5cf6] rounded-full mix-blend-screen filter blur-[140px] opacity-15 animate-pulse delay-1000 pointer-events-none z-0"></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#050505]/60 backdrop-blur-xl border-b border-white/5">
          <div className="container mx-auto px-6 h-20 flex items-center justify-between relative">
            
            {/* Logo Centralizado e Maior */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full animate-pulse bg-[#22c55e] shadow-[0_0_15px_#22c55e]" />
              <span className="text-3xl font-black tracking-[0.2em] font-mono text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">ZAPLINK</span>
            </div>

            {/* Apenas para manter o flex-between no mobile se necessário, ou empurrar os botões para a direita */}
            <div></div>

            <div className="flex items-center gap-4 ml-auto z-10">
              <Link href="/auth/login" className="text-sm font-medium text-[#8b949e] hover:text-white transition-colors">Entrar</Link>
              <Link href="/auth/register"
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#22c55e] to-[#10b981] text-[#0a1a10] shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:brightness-110 hover:scale-105 transition-all"
              >Criar Conta Grátis</Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="container mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-8 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            3 Dias Grátis de Teste Inicial
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight text-white tracking-tight">
            Venda no automático com
            <br />
            <span className="bg-gradient-to-r from-[#22c55e] to-[#8b5cf6] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]">
              Disparos em Massa
            </span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-[#8b949e]">
            A solução completa para escala: Rotação Anti-Ban, Inteligência Artificial, Extração de Grupos e **Gestor de Proxies Automático**.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/register"
              className="px-8 py-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-[#22c55e] to-[#10b981] text-[#0a1a10] shadow-[0_10px_30px_rgba(34,197,94,0.3)] hover:scale-105 transition-transform"
            >Quero Começar Agora →</Link>
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="px-8 py-4 rounded-2xl font-bold text-sm border border-white/10 text-[#8b949e] bg-white/5 hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm"
            >Falar no WhatsApp</a>
          </div>
        </section>

        {/* Features Glassmorphism */}
        <section className="container mx-auto px-6 py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-white">
            A arma secreta das <span className="text-[#22c55e]">grandes operações</span>
          </h2>
          <p className="text-center text-sm mb-12 text-[#8b949e]">Nós cuidamos da tecnologia, você foca em vender.</p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: '🧹', title: 'Limpeza de Lista', desc: 'Filtre números válidos que possuem WhatsApp ativo (9º dígito) antes de disparar.' },
              { icon: '👥', title: 'Extração de Grupos', desc: 'Capture milhares de leads qualificados de qualquer grupo em segundos.' },
              { icon: '🔄', title: 'Rotação Inteligente', desc: 'Alterna entre múltiplos chips automaticamente para diluir o volume de envios.' },
              { icon: '🤖', title: 'IA (ChatGPT)', desc: 'Respostas e reescrita de mensagens para parecerem 100% humanas.' },
              { icon: '▷', title: 'Envio para Grupos', desc: 'Dispare suas ofertas em massa para centenas de grupos simultaneamente.' },
              { icon: '⏱️', title: 'Delays Reais', desc: 'Simulação de digitação e pausas aleatórias que imitam o comportamento humano.' },
              { icon: '📊', title: 'Monitor Full', desc: 'Acompanhe envios, falhas e métricas em tempo real com relatórios detalhados.' },
              { icon: '🛡️', title: 'Proteção LGPD', desc: 'Sistema em conformidade com as leis de privacidade e segurança de dados.' },
            ].map((f, i) => (
              <div key={i} className="rounded-3xl p-8 transition-all hover:-translate-y-2 group cursor-default bg-[#16181c]/60 backdrop-blur-xl border border-white/5 hover:border-[#22c55e]/30 shadow-2xl">
                <div className="text-4xl mb-6 bg-gradient-to-br from-[#22c55e]/20 to-transparent w-16 h-16 rounded-2xl flex items-center justify-center border border-white/5">{f.icon}</div>
                <h3 className="text-lg font-bold mb-3 text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-[#8b949e]">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="container mx-auto px-6 py-24" id="planos">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4 text-white">Planos</h2>
          <p className="text-center text-sm mb-16 text-[#8b949e]">Comece de graça e faça o upgrade quando precisar de mais poder de fogo.</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
            {plans.map((plan, i) => (
              <div key={i} className={`relative rounded-3xl p-8 transition-all duration-300 ${plan.highlight ? 'bg-[#16181c]/90 backdrop-blur-2xl border-2 border-[#22c55e] transform md:scale-105 shadow-[0_0_50px_rgba(34,197,94,0.15)] z-10' : plan.pulsing ? 'bg-[#16181c]/90 backdrop-blur-2xl border-2 border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.15)] animate-pulse z-10' : 'bg-[#16181c]/40 backdrop-blur-xl border border-white/5 hover:border-white/20 z-0'}`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0a1a10] shadow-lg shadow-orange-500/30 whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}
                <h3 className="text-xl font-bold mb-1 text-white">{plan.name}</h3>
                
                <div className="flex items-baseline gap-1 mb-8 mt-4">
                  <span className="text-sm text-[#8b949e] font-bold">R$</span>
                  <span className={`text-5xl font-black ${plan.highlight ? 'text-[#22c55e]' : 'text-white'}`}>{plan.price}</span>
                  <span className="text-sm text-[#8b949e] font-bold">{plan.period}</span>
                </div>
                
                <ul className="space-y-4 mb-10">
                  {plan.features.map((f, j) => (
                    <li key={j} className={`flex items-start gap-3 text-sm font-medium ${f.included ? 'text-[#e8eaed]' : 'text-[#4b5563] line-through'}`}>
                      <span className={`mt-0.5 ${f.included ? 'text-[#22c55e]' : 'text-[#4b5563]'}`}>
                        {f.included ? '✓' : '✕'}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                
                <Link href={plan.link}
                  className={`block w-full text-center py-4 rounded-xl font-bold text-sm transition-all ${
                    plan.highlight 
                      ? 'bg-gradient-to-r from-[#22c55e] to-[#10b981] text-[#0a1a10] shadow-lg shadow-green-500/30 hover:brightness-110' 
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  }`}
                >{plan.cta}</Link>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 mt-12 border-t border-white/5 bg-[#050505]/80 backdrop-blur-md">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12 items-center text-center md:text-left mb-12">
              <div className="space-y-4">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_12px_#22c55e]" />
                  <span className="text-lg font-bold tracking-widest font-mono text-white">ZAPLINK</span>
                </div>
                <p className="text-xs text-[#8b949e] leading-relaxed max-w-xs mx-auto md:mx-0">
                  ZapLink — CNPJ 32.657.200/0001-08 <br/>
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
                  DISCLAIMER: Não nos responsabilizamos por números banidos.<br/>
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

        {/* WhatsApp Floating Button */}
        <a href={waLink} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 z-50 bg-[#22c55e] shadow-[0_4px_20px_rgba(34,197,94,0.3)]"
          title="Falar no WhatsApp"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#0a1a10]">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>

        {/* JSON-LD Structured Data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              'name': 'ZapLink',
              'operatingSystem': 'Windows, Linux, macOS',
              'applicationCategory': 'BusinessApplication',
              'offers': {
                '@type': 'Offer',
                'price': '49.90',
                'priceCurrency': 'BRL'
              },
              'description': 'Sistema profissional de automação e disparos em massa no WhatsApp com IA e anti-ban.'
            })
          }}
        ></script>
      </div>
    </div>
  )
}
