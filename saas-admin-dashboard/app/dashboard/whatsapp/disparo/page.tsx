'use client'

import { useState } from 'react'
import { Send, Clock, Play, Pause, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react'

export default function DisparoPage() {
  const [activeTab, setActiveTab] = useState<'nova' | 'historico'>('nova')

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#0b141a] custom-scrollbar pb-10">
      {/* Header */}
      <header className="h-[80px] flex items-center justify-between px-8 bg-[#111b21] border-b border-[#202c33] shrink-0">
        <div>
          <h1 className="text-white text-xl font-semibold">Campanhas de Disparo</h1>
          <p className="text-xs text-[#8696a0] mt-1">Crie envios em massa com intervalos seguros anti-ban.</p>
        </div>

        <div className="flex bg-[#202c33] p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('nova')}
            className={`px-4 py-2 text-sm rounded-md transition border-none cursor-pointer font-medium ${activeTab === 'nova' ? 'bg-[#0b141a] text-white shadow-sm' : 'bg-transparent text-[#8696a0] hover:text-white'}`}
          >
            Nova Campanha
          </button>
          <button 
            onClick={() => setActiveTab('historico')}
            className={`px-4 py-2 text-sm rounded-md transition border-none cursor-pointer font-medium ${activeTab === 'historico' ? 'bg-[#0b141a] text-white shadow-sm' : 'bg-transparent text-[#8696a0] hover:text-white'}`}
          >
            Histórico Ativo
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8 max-w-5xl mx-auto w-full flex gap-8">
        
        {activeTab === 'nova' ? (
          <>
            {/* Esquerda: Configuração */}
            <div className="flex-1 space-y-6">
              <div className="bg-[#111b21] rounded-xl border border-[#202c33] p-6 space-y-4">
                <h2 className="text-white font-medium mb-4">Configuração Básica</h2>
                
                <div className="space-y-2">
                  <label className="text-xs text-[#8696a0] uppercase tracking-wider font-semibold">Nome da Campanha</label>
                  <input type="text" placeholder="Ex: Promoção Dia das Mães" className="w-full px-4 py-3 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-white outline-none transition text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#8696a0] uppercase tracking-wider font-semibold flex justify-between">
                    <span>Mensagem</span>
                    <span className="text-amber-500 font-normal normal-case">Use {'{nome}'} para personalizar</span>
                  </label>
                  <textarea rows={6} placeholder="Olá {nome}, tudo bem? Temos uma oferta especial..." className="w-full px-4 py-3 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-white outline-none transition text-sm resize-none custom-scrollbar" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-[#8696a0] uppercase tracking-wider font-semibold flex items-center gap-2"><Clock size={14} /> Delay Mínimo (s)</label>
                    <input type="number" defaultValue={15} className="w-full px-4 py-3 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-white outline-none transition text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[#8696a0] uppercase tracking-wider font-semibold flex items-center gap-2"><Clock size={14} /> Delay Máximo (s)</label>
                    <input type="number" defaultValue={30} className="w-full px-4 py-3 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-white outline-none transition text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Direita: Leads e Disparo */}
            <div className="w-[400px] space-y-6">
              <div className="bg-[#111b21] rounded-xl border border-[#202c33] p-6 space-y-4">
                <h2 className="text-white font-medium mb-4 flex justify-between items-center">
                  Lista de Envios
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">0 selecionados</span>
                </h2>

                <p className="text-xs text-[#8696a0] leading-relaxed">
                  Para disparar, você precisa selecionar Leads importados na aba de <strong className="text-white">Leads</strong> ou colar os números manualmente abaixo.
                </p>

                <div className="space-y-2">
                  <label className="text-xs text-[#8696a0] uppercase tracking-wider font-semibold">Números (um por linha)</label>
                  <textarea rows={6} placeholder="5511999999999\n5511888888888" className="w-full px-4 py-3 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-white outline-none transition text-sm resize-none custom-scrollbar font-mono" />
                </div>

                <button className="w-full py-4 bg-[#00a884] hover:bg-[#008f6f] text-white font-semibold rounded-xl transition flex justify-center items-center gap-2 border-none cursor-pointer mt-4 shadow-lg shadow-[#00a884]/20">
                  <Send size={18} /> Iniciar Disparo
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full space-y-4">
            {/* Histórico vazio mock */}
            <div className="bg-[#111b21] rounded-xl border border-[#202c33] p-6 flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-[#202c33] rounded-full flex items-center justify-center text-[#8696a0] mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-white text-lg font-medium">Nenhuma campanha rodando</h3>
              <p className="text-[#8696a0] text-sm mt-2 max-w-md">Os disparos criados aparecerão aqui em tempo real. Você poderá pausar ou acompanhar o progresso.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
