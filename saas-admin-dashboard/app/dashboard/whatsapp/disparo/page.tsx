'use client'

import { useState } from 'react'
import { useState, useEffect } from 'react'
import { Send, Clock, Play, Pause, X, FileText, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react'

export default function DisparoPage() {
  const [activeTab, setActiveTab] = useState<'nova' | 'historico'>('nova')
  const [instances, setInstances] = useState<any[]>([])
  const [selectedInstance, setSelectedInstance] = useState('')
  const [name, setName] = useState('')
  const [messageTemplate, setMessageTemplate] = useState('')
  const [delayMin, setDelayMin] = useState(15)
  const [delayMax, setDelayMax] = useState(30)
  const [numbersText, setNumbersText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    // Buscar as instâncias de WhatsApp disponíveis
    fetch('/api/whatsapp/status')
      .then(res => res.json())
      .then(data => {
        if (data.status && data.status.id) {
          // Atualmente a API retorna o status da única instância ou lista. Adaptando para aceitar ambos.
          const instanceList = Array.isArray(data.status) ? data.status : [data.status]
          const connected = instanceList.filter(i => i.status === 'connected')
          setInstances(connected)
          if (connected.length > 0) setSelectedInstance(connected[0].id)
        }
      })
      .catch(err => console.error('Erro ao buscar instâncias', err))
  }, [])

  useEffect(() => {
    if (activeTab === 'historico') {
      fetchHistory()
    }
  }, [activeTab])

  const fetchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      // Usaremos o endpoint genérico do supabase ou uma API route específica se precisarmos, 
      // mas para MVP vamos bater numa /api/disparos/list
      const res = await fetch('/api/disparos/list')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleStartCampaign = async () => {
    if (!selectedInstance || !name || !messageTemplate || !numbersText) {
      setFeedback({ type: 'error', message: 'Preencha todos os campos obrigatórios.' })
      return
    }

    const numberList = numbersText.split('\n').map(n => n.trim()).filter(n => n)
    if (numberList.length === 0) {
      setFeedback({ type: 'error', message: 'Lista de números vazia.' })
      return
    }

    setIsLoading(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/disparos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance_id: selectedInstance,
          name,
          message_template: messageTemplate,
          delay_min: delayMin,
          delay_max: delayMax,
          numbers: numberList
        })
      })

      const data = await res.json()

      if (res.ok) {
        setFeedback({ type: 'success', message: `Campanha criada! ${data.total_leads} leads na fila de disparo.` })
        // Limpar form
        setName('')
        setMessageTemplate('')
        setNumbersText('')
        setActiveTab('historico')
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao criar campanha.' })
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Erro interno de conexão.' })
    } finally {
      setIsLoading(false)
    }
  }

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
                  <label className="text-xs text-[#8696a0] uppercase tracking-wider font-semibold flex items-center gap-2"><Smartphone size={14}/> Instância do WhatsApp</label>
                  <select 
                    value={selectedInstance}
                    onChange={(e) => setSelectedInstance(e.target.value)}
                    className="w-full px-4 py-3 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-white outline-none transition text-sm appearance-none"
                  >
                    <option value="" disabled>Selecione um número conectado</option>
                    {instances.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.instance_name} ({inst.phone_number})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#8696a0] uppercase tracking-wider font-semibold">Nome da Campanha</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Promoção Dia das Mães" 
                    className="w-full px-4 py-3 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-white outline-none transition text-sm" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#8696a0] uppercase tracking-wider font-semibold flex justify-between">
                    <span>Mensagem</span>
                    <span className="text-amber-500 font-normal normal-case">Use {'{nome}'} para personalizar</span>
                  </label>
                  <textarea 
                    rows={6} 
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder="Olá {nome}, tudo bem? Temos uma oferta especial..." 
                    className="w-full px-4 py-3 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-white outline-none transition text-sm resize-none custom-scrollbar" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-[#8696a0] uppercase tracking-wider font-semibold flex items-center gap-2"><Clock size={14} /> Delay Mínimo (s)</label>
                    <input 
                      type="number" 
                      value={delayMin}
                      onChange={(e) => setDelayMin(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-white outline-none transition text-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[#8696a0] uppercase tracking-wider font-semibold flex items-center gap-2"><Clock size={14} /> Delay Máximo (s)</label>
                    <input 
                      type="number" 
                      value={delayMax}
                      onChange={(e) => setDelayMax(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-white outline-none transition text-sm" 
                    />
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
                  <textarea 
                    rows={6} 
                    value={numbersText}
                    onChange={(e) => setNumbersText(e.target.value)}
                    placeholder="5511999999999\n5511888888888" 
                    className="w-full px-4 py-3 bg-[#202c33] border border-transparent focus:border-[#00a884] rounded-lg text-white outline-none transition text-sm resize-none custom-scrollbar font-mono" 
                  />
                </div>

                {feedback && (
                  <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${feedback.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{feedback.message}</span>
                  </div>
                )}

                <button 
                  onClick={handleStartCampaign}
                  disabled={isLoading}
                  className="w-full py-4 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-semibold rounded-xl transition flex justify-center items-center gap-2 border-none cursor-pointer mt-4 shadow-lg shadow-[#00a884]/20"
                >
                  {isLoading ? 'Criando...' : <><Send size={18} /> Iniciar Disparo</>}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full space-y-4">
            {isLoadingHistory ? (
              <div className="text-center text-[#8696a0] py-10">Carregando histórico...</div>
            ) : campaigns.length === 0 ? (
              <div className="bg-[#111b21] rounded-xl border border-[#202c33] p-6 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-[#202c33] rounded-full flex items-center justify-center text-[#8696a0] mb-4">
                  <FileText size={32} />
                </div>
                <h3 className="text-white text-lg font-medium">Nenhuma campanha rodando</h3>
                <p className="text-[#8696a0] text-sm mt-2 max-w-md">Os disparos criados aparecerão aqui em tempo real. Você poderá pausar ou acompanhar o progresso.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaigns.map(camp => (
                  <div key={camp.id} className="bg-[#111b21] rounded-xl border border-[#202c33] p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-white font-medium">{camp.name}</h3>
                        <p className="text-xs text-[#8696a0] font-mono mt-1">{new Date(camp.created_at).toLocaleDateString()} {new Date(camp.created_at).toLocaleTimeString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs capitalize ${
                        camp.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                        camp.status === 'running' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                        camp.status === 'error' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {camp.status}
                      </span>
                    </div>
                    
                    <div className="bg-[#0b141a] p-3 rounded-lg text-xs text-[#d1d7db] font-mono line-clamp-3 mb-4 flex-1">
                      {camp.message_template}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium border-t border-[#202c33] pt-4">
                      <div className="text-blue-400">Pendente: {camp.metrics?.pending || 0}</div>
                      <div className="text-green-500">Enviado: {camp.metrics?.sent || 0}</div>
                      <div className="text-red-500">Falha: {camp.metrics?.failed || 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
