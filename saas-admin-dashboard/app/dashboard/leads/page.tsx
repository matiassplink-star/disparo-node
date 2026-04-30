'use client'

import { useState, useEffect } from 'react'
import { Search, Download, Upload, Plus, Users, Filter, MoreHorizontal } from 'lucide-react'

export default function LeadsPage() {
  const [search, setSearch] = useState('')
  const [leads, setLeads] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async (searchQuery = '') => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/leads?search=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
      }
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Debounce simple for search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0b141a]">
      {/* Header */}
      <header className="h-[60px] flex items-center justify-between px-6 bg-[#111b21] border-b border-[#202c33]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-white font-semibold">Leads (Gestão de Contatos)</h1>
            <p className="text-xs text-[#8696a0]">Gerencie sua base de contatos, importe listas e dispare campanhas.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-[#202c33] hover:bg-[#2a3942] text-white text-sm rounded-lg transition flex items-center gap-2 border-none cursor-pointer">
            <Download size={16} /> Exportar CSV
          </button>
          <button className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white text-sm rounded-lg transition flex items-center gap-2 border-none cursor-pointer font-medium">
            <Upload size={16} /> Importar Leads
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition flex items-center gap-2 border-none cursor-pointer font-medium">
            <Plus size={16} /> Adicionar Lead
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
          <input 
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#202c33] text-white text-sm rounded-lg outline-none focus:ring-2 focus:ring-[#00a884] border-none placeholder-[#8696a0] transition"
          />
        </div>
        
        <button className="px-3 py-2 text-[#8696a0] hover:text-white transition flex items-center gap-2 border border-[#202c33] rounded-lg bg-transparent cursor-pointer text-sm">
          <Filter size={16} /> Filtrar por Tags
        </button>
      </div>

      {/* Tabela de Leads */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto custom-scrollbar">
        <div className="bg-[#111b21] rounded-xl border border-[#202c33] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#202c33] text-[#8696a0] text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium"><input type="checkbox" className="rounded bg-[#202c33] border-none w-4 h-4" /></th>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">Telefone</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Tags</th>
                <th className="px-6 py-4 font-medium">Data de Criação</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#8696a0]">Carregando leads...</td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#8696a0]">
                    Nenhum lead encontrado. Importe uma lista para começar.
                  </td>
                </tr>
              ) : (
                leads.map((lead: any) => (
                  <tr key={lead.id} className="border-b border-[#202c33] hover:bg-[#202c33]/50 transition text-[#d1d7db]">
                    <td className="px-6 py-4"><input type="checkbox" className="rounded bg-[#202c33] border-none w-4 h-4" /></td>
                    <td className="px-6 py-4 font-medium text-white">{lead.name || 'Sem nome'}</td>
                    <td className="px-6 py-4 font-mono text-xs">{lead.phone}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-xs">Ativo</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {lead.tags && lead.tags.length > 0 ? (
                          lead.tags.map((tag: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-[#202c33] text-[#8696a0] text-[10px]">{tag}</span>
                          ))
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#202c33] text-[#8696a0] text-[10px] capitalize">{lead.source || 'Manual'}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#8696a0] text-xs">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[#8696a0] hover:text-white bg-transparent border-none cursor-pointer">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
