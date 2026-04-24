import Link from 'next/link'

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#e8eaed] p-8 md:p-24 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#22c55e] hover:underline mb-8 inline-block">← Voltar para Home</Link>
        <h1 className="text-4xl font-bold mb-8">Termos de Uso</h1>
        <div className="space-y-6 text-[#8b949e] leading-relaxed">
          <p>Ao acessar o site ZapLink, você concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis.</p>
          <h2 className="text-2xl font-semibold text-white mt-8">1. Licença de Uso</h2>
          <p>É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site ZapLink , apenas para visualização transitória pessoal e não comercial.</p>
          <h2 className="text-2xl font-semibold text-white mt-8">2. Isenção de Responsabilidade (BANIMENTOS)</h2>
          <p className="bg-red-500/10 p-4 border border-red-500/20 rounded-lg text-red-400">
            <strong>IMPORTANTE:</strong> O ZapLink é uma ferramenta de automação. O uso de automação pode violar os Termos de Serviço do WhatsApp. O ZapLink NÃO se responsabiliza por números banidos, bloqueados ou qualquer sanção aplicada pelo WhatsApp ao usuário. O risco do uso da ferramenta é inteiramente do usuário.
          </p>
          <h2 className="text-2xl font-semibold text-white mt-8">3. Limitações</h2>
          <p>Em nenhum caso o ZapLink ou seus fornecedores serão responsáveis ​​por quaisquer danos decorrentes do uso ou da incapacidade de usar os materiais em ZapLink.</p>
          <h2 className="text-2xl font-semibold text-white mt-8">4. LGPD</h2>
          <p>O usuário declara estar ciente de suas responsabilidades ao tratar dados de terceiros (contatos) através da plataforma, devendo respeitar a privacidade e o consentimento dos mesmos conforme a LGPD.</p>
        </div>
      </div>
    </div>
  )
}
