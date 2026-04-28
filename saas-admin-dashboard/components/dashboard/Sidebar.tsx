'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { User } from '@/types'
import { useLanguage } from '@/components/atualizacao/LanguageContext'
import { 
  LayoutDashboard, 
  Send, 
  Eraser, 
  LifeBuoy, 
  Globe, 
  LogOut,
  ShieldCheck,
  MessageSquare,
  Bot,
  Download,
  Users,
  Smartphone
} from 'lucide-react'

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  user?: User | null
  mobileOpen?: boolean
  setMobileOpen?: (open: boolean) => void
}

export function Sidebar({ collapsed = false, onToggle: _onToggle, user, mobileOpen = false, setMobileOpen }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isLoading, setIsLoading] = useState(false)
  const { t } = useLanguage()

  const menuGroups = [
    {
      label: t('group.principal'),
      items: [
        { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, color: '#3b82f6' },
        { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: Smartphone, color: '#22c55e' },
      ]
    },
    {
      label: 'Atendimento',
      items: [
        { href: '/dashboard/crm', label: 'CRM & Chat', icon: MessageSquare, color: '#3b82f6' },
        { href: '/dashboard/agente', label: 'Agente IA', icon: Bot, color: '#10b981' },
      ]
    },
    {
      label: t('group.disparos'),
      items: [
        { href: '/dashboard/whatsapp/disparo', label: t('nav.send'), icon: Send, color: '#10b981' },
        { href: '/dashboard/whatsapp/limpeza', label: t('nav.cleaning'), icon: Eraser, color: '#06b6d4' },
        { href: '/dashboard/whatsapp/extrator', label: 'Extrator', icon: Download, color: '#ec4899' },
        { href: '/dashboard/whatsapp/grupos', label: t('nav.groups'), icon: Users, color: '#f97316' },
      ]
    },
    {
      label: t('group.suporte'),
      items: [
        { href: '/dashboard/tutoriais', label: t('nav.tutorials'), icon: LifeBuoy, color: '#64748b' },
        { href: 'https://wa.me/5534999929764', label: t('nav.community'), icon: Globe, color: '#22c55e', external: true },
      ]
    }
  ]

  if (user?.plano === 'admin') {
    menuGroups.push({
      label: t('group.admin'),
      items: [
        { href: '/dashboard/users', label: t('nav.users'), icon: ShieldCheck, color: '#ef4444' },
      ]
    })
  }

  const handleItemClick = (item: { action?: string; panel?: string; href?: string; external?: boolean }, e: React.MouseEvent) => {
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
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${collapsed ? 'w-[68px]' : 'w-64'}
        bg-white dark:bg-[#16181c] border-r border-gray-200 dark:border-[#2a2d34] shadow-xl md:shadow-none`}
    >
      {/* Header Logo */}
      <div className={`flex items-center h-[52px] border-b border-gray-100 dark:border-[#2a2d34] ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-xs font-bold tracking-widest text-slate-900 dark:text-white font-mono">
              ZAPLINK
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
        )}
      </div>

      {/* Nav Content */}
      <nav className="flex-1 py-4 px-2.5 overflow-y-auto hide-scrollbar space-y-6">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-3 mb-2 text-[10px] tracking-widest uppercase font-bold text-slate-400 dark:text-slate-600 font-mono">
                {group.label}
              </div>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = item.href !== '#' && (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
                const Icon = item.icon

                return (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      onClick={(e) => handleItemClick(item, e)}
                      className={`flex items-center gap-3 rounded-xl transition-all text-xs no-underline group relative py-2.5 ${
                        collapsed ? 'justify-center px-0' : 'px-3'
                      } ${isActive 
                        ? 'text-green-700 dark:text-white font-semibold bg-green-500/10 dark:bg-green-500/20' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon 
                        size={18} 
                        strokeWidth={2.5}
                        className={`transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                        style={{ color: isActive ? '#22c55e' : (item as { color?: string }).color || '#64748b' }}
                      />
                      {!collapsed && (
                        <div className="flex justify-between items-center w-full">
                          <span className="truncate">{item.label}</span>
                        </div>
                      )}
                      {isActive && !collapsed && (
                        <div className="absolute left-0 w-1 h-5 bg-green-500 rounded-r-full" />
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-gray-100 dark:border-[#2a2d34]">
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className={`flex items-center gap-2 rounded-xl transition-all text-xs font-semibold ${
            collapsed ? 'w-10 h-10 justify-center' : 'w-full px-4 py-2.5'
          } bg-red-500/5 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 shadow-sm shadow-red-500/10`}
        >
          <LogOut size={18} strokeWidth={2.5} />
          {!collapsed && <span>{isLoading ? '...' : t('nav.logout')}</span>}
        </button>
      </div>
    </aside>
  )
}
