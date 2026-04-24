'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { User } from '@/types'
import { useLanguage } from '@/components/atualizacao/LanguageContext'

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  user?: User | null
  mobileOpen?: boolean
  setMobileOpen?: (open: boolean) => void
}

export function Sidebar({ collapsed = false, onToggle, user, mobileOpen = false, setMobileOpen }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentPanel = searchParams.get('panel') || 'dashboard'
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useLanguage()

  const menuGroups = [
    {
      label: t('group.main'),
      items: [
        { href: '/dashboard', label: t('nav.dashboard'), icon: '◈' },
        { href: '/dashboard/whatsapp', label: t('nav.whatsapp'), icon: '◫', action: 'panel', panel: 'dashboard' },
        { href: '/dashboard/whatsapp', label: t('nav.connect'), icon: '⊕', action: 'panel', panel: 'numeros' },
      ]
    },
    {
      label: t('group.shoots'),
      items: [
        { href: '#', label: t('nav.contacts'), icon: '◫', action: 'panel', panel: 'contatos' },
        { href: '#', label: t('nav.shoot'), icon: '▶', action: 'panel', panel: 'disparo' },
      ]
    },
    {
      label: t('group.tools'),
      items: [
        { href: '#', label: t('nav.extract'), icon: '◎', action: 'panel', panel: 'grupos', premium: true },
        { href: '#', label: t('nav.clean'), icon: '🧹', action: 'panel', panel: 'limpeza', premium: true },
        { href: '#', label: t('nav.send_group'), icon: '▷', action: 'panel', panel: 'envioGrupos', premium: true },
        { href: '#', label: t('nav.add_group'), icon: '⊕', action: 'panel', panel: 'addGrupos', premium: true },
        { href: '#', label: t('nav.reports'), icon: '≡', action: 'panel', panel: 'logs' },
      ]
    },
    {
      label: t('group.support'),
      items: [
        { href: '/dashboard/tutoriais', label: t('nav.tutorials'), icon: '▶' },
        { href: 'https://wa.me/5534999929764', label: t('nav.community'), icon: '👥', external: true },
      ]
    }
  ]

  if (user?.plano === 'admin') {
    menuGroups.push({
      label: t('group.admin'),
      items: [
        { href: '/dashboard/users', label: t('nav.users'), icon: '◫' },
        { href: '/dashboard/settings', label: t('nav.settings'), icon: '⚙' },
      ]
    })
  }

  const handleItemClick = (item: any, e: React.MouseEvent) => {
    if (item.external) return;

    e.preventDefault();
    
    if (setMobileOpen) setMobileOpen(false);

    if (item.action === 'panel') {
      router.push('/dashboard/whatsapp?panel=' + item.panel);
    } else if (item.href && item.href !== '#') {
      router.push(item.href);
    }
  }

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/login')
    } catch {
      alert('Erro ao fazer logout')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <aside
      className={`h-screen fixed left-0 top-0 flex flex-col z-40 transition-all duration-300 
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      style={{
        width: collapsed ? '68px' : '256px',
        background: '#16181c',
        borderRight: '1px solid #2a2d34',
      }}
    >
      <div
        className={`flex items-center h-[52px] ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}
        style={{ borderBottom: '1px solid #2a2d34' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span className="text-sm font-medium tracking-wider" style={{ color: '#e8eaed', fontFamily: "'DM Mono', monospace" }}>
              ZAPLINK
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
        )}
        <button
          onClick={onToggle}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors text-xs"
          style={{ color: '#6b7280' }}
          onMouseOver={(e) => { e.currentTarget.style.color = '#e8eaed'; e.currentTarget.style.background = '#1c1f24' }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'transparent' }}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="flex-1 py-3 px-2.5 overflow-y-auto hide-scrollbar">
        {menuGroups.map((group, gIdx) => (
          <div key={group.label} className={gIdx > 0 ? 'mt-6' : ''}>
            {!collapsed && (
              <div className="px-3 pb-2 pt-1 text-[10px] tracking-widest uppercase font-bold" style={{ color: '#4b5563', fontFamily: "'DM Mono', monospace" }}>
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isPanelActive = item.action === 'panel' && pathname === '/dashboard/whatsapp' && currentPanel === item.panel
                const isUrlActive = item.href !== '#' && (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
                const isActive = isPanelActive || (item.action !== 'panel' && isUrlActive)
                
                return (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      onClick={(e) => handleItemClick(item, e)}
                      title={collapsed ? item.label : ''}
                      className={`flex items-center gap-2.5 rounded-xl transition-all text-[13px] no-underline group relative ${
                        collapsed ? 'justify-center px-2 py-2.5' : 'px-4 py-2.5'
                      }`}
                      style={{
                        color: isActive ? '#fff' : '#8b949e',
                        background: isActive ? 'linear-gradient(90deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.02) 100%)' : 'transparent',
                        cursor: 'pointer',
                        fontWeight: isActive ? '600' : '400'
                      }}
                      onMouseOver={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = '#fff'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = '#8b949e'
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      {isActive && !collapsed && (
                        <div className="absolute left-0 w-1 h-6 bg-[#22c55e] rounded-r-full" />
                      )}
                      <span className={`text-sm flex-shrink-0 w-4 text-center transition-all ${isActive ? 'text-[#22c55e]' : 'group-hover:text-white'}`}>{item.icon}</span>
                      {!collapsed && (
                        <div className="flex justify-between items-center w-full">
                          <span>{item.label}</span>
                          {item.premium && user?.plano !== 'premium' && user?.plano !== 'admin' && (
                            <span title="Recurso Premium" style={{ fontSize: '10px' }}>🔒</span>
                          )}
                        </div>
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={`${collapsed ? 'p-2' : 'p-3'}`} style={{ borderTop: '1px solid #2a2d34' }}>
        <button
          onClick={handleLogout}
          disabled={isLoading}
          title={collapsed ? 'Sair' : ''}
          className={`flex items-center justify-center gap-2 rounded-lg transition-all text-[13px] font-medium ${
            collapsed ? 'w-10 h-10 mx-auto' : 'w-full px-4 py-2'
          }`}
          style={{
            background: 'rgba(239,68,68,0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white' }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
        >
          {collapsed ? '✕' : isLoading ? '...' : t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}
