'use client'

import { useEffect, useState } from 'react'
import { User } from '@/types'

interface Tutorial {
  id: string
  titulo: string
  descricao: string
  youtube_url: string
  ordem: number
  categoria: string
  nivel_acesso: string
}

// Extrair ID do YouTube de qualquer formato de URL
function getYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export default function TutoriaisPage() {
  const [user, setUser] = useState<User | null>(null)
  const [tutoriais, setTutoriais] = useState<Tutorial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ titulo: '', descricao: '', youtube_url: '', categoria: 'Básico', nivel_acesso: 'free' })
  const [isSaving, setIsSaving] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [meRes, tutRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/tutoriais'),
      ])
      if (meRes.ok) setUser(await meRes.json())
      if (tutRes.ok) {
        const data = await tutRes.json()
        setTutoriais(data.tutoriais || [])
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.titulo || !formData.youtube_url) return
    const ytId = getYoutubeId(formData.youtube_url)
    if (!ytId) { alert('URL do YouTube inválida'); return }

    setIsSaving(true)
    try {
      const res = await fetch('/api/tutoriais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, youtube_url: formData.youtube_url }),
      })
      if (res.ok) {
        setFormData({ titulo: '', descricao: '', youtube_url: '', categoria: 'Básico', nivel_acesso: 'free' })
        setShowForm(false)
        fetchData()
      } else {
        const err = await res.json()
        alert('Erro: ' + (err.error || 'Erro ao criar'))
      }
    } catch { alert('Erro ao salvar') }
    finally { setIsSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar este tutorial?')) return
    try {
      const res = await fetch(`/api/tutoriais/${id}`, { method: 'DELETE' })
      if (res.ok) setTutoriais(tutoriais.filter((t) => t.id !== id))
    } catch { alert('Erro ao deletar') }
  }

  const isAdmin = user?.plano === 'admin'

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#22c55e', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#e8eaed' }}>Tutoriais</h1>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
            {isAdmin ? 'Gerencie os tutoriais do sistema' : 'Aprenda a usar o sistema'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border-none"
            style={{
              background: showForm ? 'rgba(239,68,68,0.1)' : '#22c55e',
              color: showForm ? '#ef4444' : '#0a1a10',
            }}
          >
            {showForm ? '✕ Cancelar' : '+ Novo Tutorial'}
          </button>
        )}
      </div>

      {/* Form admin */}
      {isAdmin && showForm && (
        <div className="rounded-lg p-5 space-y-4" style={{ background: '#16181c', border: '1px solid #2a2d34' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#e8eaed' }}>Adicionar tutorial</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Título</label>
              <input type="text" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Como conectar um número"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-colors"
                style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2d34' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Descrição (opcional)</label>
              <input type="text" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Breve descrição do tutorial"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-colors"
                style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2d34' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Categoria</label>
                <select value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-colors"
                  style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed' }}
                >
                  <option value="Comece por Aqui">Comece por Aqui</option>
                  <option value="Básico">Básico</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="Estratégias Avançadas">Estratégias Avançadas</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Nível de Acesso</label>
                <select value={formData.nivel_acesso} onChange={(e) => setFormData({ ...formData, nivel_acesso: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-colors"
                  style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed' }}
                >
                  <option value="free">Todos (Grátis)</option>
                  <option value="premium">Apenas Pagantes (VIP)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium tracking-wider uppercase mb-1.5" style={{ color: '#6b7280' }}>Link do YouTube</label>
              <input type="text" value={formData.youtube_url} onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-colors"
                style={{ background: '#1c1f24', border: '1px solid #2a2d34', color: '#e8eaed' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2d34' }}
              />
            </div>
            {formData.youtube_url && getYoutubeId(formData.youtube_url) && (
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2a2d34' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${getYoutubeId(formData.youtube_url)}`}
                  className="w-full aspect-video"
                  allowFullScreen
                />
              </div>
            )}
            <button onClick={handleAdd} disabled={isSaving}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border-none disabled:opacity-50"
              style={{ background: '#22c55e', color: '#0a1a10' }}
            >{isSaving ? 'Salvando...' : 'Adicionar tutorial'}</button>
          </div>
        </div>
      )}

      {/* Lista de tutoriais */}
      {tutoriais.length === 0 ? (
        <div className="text-center py-16 rounded-lg" style={{ background: '#16181c', border: '1px solid #2a2d34' }}>
          <div className="text-3xl mb-3 opacity-30">▶</div>
          <p className="text-xs" style={{ color: '#6b7280' }}>Nenhum tutorial cadastrado</p>
          {isAdmin && <p className="text-[10px] mt-1" style={{ color: '#4b5563' }}>Clique em &ldquo;+ Novo Tutorial&rdquo; para começar</p>}
        </div>
      ) : (
        <div className="space-y-10">
          <style dangerouslySetInnerHTML={{__html: `
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}} />
          
          {Object.entries(
            tutoriais.reduce((acc, t) => {
              const cat = t.categoria || 'Geral'
              if (!acc[cat]) acc[cat] = []
              acc[cat].push(t)
              return acc
            }, {} as Record<string, Tutorial[]>)
          ).map(([categoria, tuts]) => (
            <div key={categoria} className="space-y-4">
              <h2 className="text-lg font-bold text-[#e8eaed] flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#22c55e] rounded-full"></span>
                {categoria}
              </h2>
              
              <div className="flex overflow-x-auto gap-5 pb-4 snap-x snap-mandatory hide-scrollbar">
                {tuts.map((t) => {
                  const ytId = getYoutubeId(t.youtube_url)
                  const isLocked = t.nivel_acesso === 'premium' && (!user || user.plano === 'free')
                  
                  return (
                    <div key={t.id} className="min-w-[280px] sm:min-w-[320px] max-w-[320px] snap-start rounded-xl overflow-hidden transition-all group flex flex-col"
                      style={{ background: '#16181c', border: '1px solid #2a2d34' }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = isLocked ? '#ef4444' : '#353840' }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#2a2d34' }}
                    >
                      {/* Thumbnail */}
                      <div className="relative group">
                        <div
                          className="relative cursor-pointer aspect-video bg-cover bg-center transition-all duration-300"
                          style={{ 
                            backgroundImage: ytId ? `url(https://img.youtube.com/vi/${ytId}/mqdefault.jpg)` : 'none', 
                            background: ytId ? undefined : '#1c1f24',
                            filter: isLocked ? 'blur(5px) brightness(0.6)' : 'none'
                          }}
                          onClick={() => {
                            if (isLocked) {
                              alert('Este tutorial é exclusivo para membros VIP. Faça o upgrade no seu perfil para liberar!')
                              return
                            }
                            setSelectedVideo(t.id === selectedVideo ? null : t.id)
                          }}
                        >
                          {!isLocked && selectedVideo !== t.id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.9)' }}>
                                <span className="text-white text-lg ml-0.5">▶</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Cadeado Overlay */}
                        {isLocked && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
                            style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 'inherit' }}>
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-2">
                              <span className="text-2xl">🔒</span>
                            </div>
                            <span className="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">PRO</span>
                          </div>
                        )}
                      </div>

                      {/* Player */}
                      {selectedVideo === t.id && ytId && !isLocked && (
                        <div className="aspect-video w-full">
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                            className="w-full h-full"
                            allowFullScreen
                            allow="autoplay; encrypted-media"
                          />
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="text-sm font-semibold line-clamp-2" style={{ color: '#e8eaed' }}>{t.titulo}</h3>
                          {isLocked && <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">VIP</span>}
                        </div>
                        {t.descricao && <p className="text-[11px] leading-relaxed line-clamp-2 mt-auto" style={{ color: '#6b7280' }}>{t.descricao}</p>}
                        
                        {isAdmin && (
                          <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: '1px solid #2a2d34' }}>
                            <button onClick={() => handleDelete(t.id)}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer border-none transition-colors w-full"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                            >
                              Remover Vídeo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
