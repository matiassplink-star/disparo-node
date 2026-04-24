'use client'

import { useEffect, useState, useRef } from 'react'
import { User } from '@/types'
import Link from 'next/link'
import { ThemeSwitcher } from '@/components/atualizacao/ThemeSwitcher'
import { LanguageSwitcher } from '@/components/atualizacao/LanguageSwitcher'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  sidebarWidth?: number
}

export function Navbar({ sidebarWidth = 256 }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/login')
    } catch (error) {
      console.error('Erro ao sair:', error)
      window.location.href = '/auth/login'
    }
  }

  if (isLoading) return null

  return (
    <div
      className="px-4 sm:px-6 flex items-center justify-between h-[52px] transition-all duration-300 relative z-50 bg-white/80 dark:bg-[#16181c]/80 backdrop-blur-md text-foreground border-b border-gray-200 dark:border-[#2a2d34] shadow-sm"
    >
      <h2 className="text-sm font-medium hidden xs:block">ZapLink Dashboard</h2>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 border-r border-border dark:border-[#2a2d34] pr-4">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>

        <div className="relative" ref={dropdownRef}>
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all p-1.5 rounded-xl hover:bg-white/5"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {user && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold" style={{ color: '#e8eaed' }}>{user.nome || 'Usuário'}</p>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>{user.email || 'suporte.splinkagencia@gmail.com'}</p>
            </div>
          )}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
              color: '#0a1a10',
              border: '1px solid rgba(34,197,94,0.3)' 
            }}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.nome?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div 
            className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#1c1f24] border border-gray-200 dark:border-[#2a2d34] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ zIndex: 1000 }}
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2d34] bg-gray-50 dark:bg-white/5">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user?.nome}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
            <div className="p-2">
              <Link 
                href="/dashboard/perfil"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-[#22c55e]/10 hover:text-[#22c55e] transition-all no-underline"
                onClick={() => setIsDropdownOpen(false)}
              >
                <span className="text-base">👤</span> Meu Perfil
              </Link>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-400/10 transition-all text-left border-none bg-transparent"
              >
                <span className="text-base">🚪</span> Sair da Conta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  )
}



