import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#e8eaed] p-8 md:p-24 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#22c55e] hover:underline mb-8 inline-block">← Voltar para Home</Link>
        <h1 className="text-4xl font-bold mb-8">Política de Privacidade</h1>
        <div className="space-y-6 text-[#8b949e] leading-relaxed">
          <p>A sua privacidade é importante para nós. É política do ZapLink respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site ZapLink, e outros sites que possuímos e operamos.</p>
          <h2 className="text-2xl font-semibold text-white mt-8">1. Coleta de Dados</h2>
          <p>Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento.</p>
          <h2 className="text-2xl font-semibold text-white mt-8">2. Uso de Dados</h2>
          <p>O ZapLink processa dados para fornecer as funcionalidades de automação de mensagens. Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.</p>
          <h2 className="text-2xl font-semibold text-white mt-8">3. Segurança</h2>
          <p>Protegemos os dados armazenados dentro de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.</p>
          <h2 className="text-2xl font-semibold text-white mt-8">4. LGPD</h2>
          <p>Estamos em conformidade com a Lei Geral de Proteção de Dados (LGPD). Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento através das configurações da sua conta ou entrando em contato com nosso suporte.</p>
        </div>
      </div>
    </div>
  )
}
