'use client'

import { ReactNode, Suspense, useEffect, useState } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Navbar } from '@/components/dashboard/Navbar'
import { User } from '@/types'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeProvider } from '@/components/atualizacao/ThemeProvider'
import { LanguageProvider } from '@/components/atualizacao/LanguageContext'

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
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

    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  const handleToggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0e0f11' }}>
        <div className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full" style={{ borderColor: '#22c55e', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  const isAdmin = user?.plano === 'admin'

  // Fix #59: Adicionada /dashboard/settings às rotas permitidas
  if (!isAdmin) {
    const rotasPermitidas = [
      '/dashboard',
      '/dashboard/whatsapp',
      '/dashboard/chat',
      '/dashboard/crm',
      '/dashboard/agente',
      '/dashboard/tutoriais',
      '/dashboard/perfil',
      '/dashboard/settings',
    ]
    const pathSemQuery = pathname.split('?')[0]
    if (!rotasPermitidas.includes(pathSemQuery)) {
      router.replace('/dashboard/whatsapp')
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
          <div className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full" style={{ borderColor: '#22c55e', borderTopColor: 'transparent' }}></div>
        </div>
      )
    }
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="flex min-h-screen relative overflow-hidden bg-background text-foreground transition-colors duration-300 dark:bg-[#050505] bg-white">
          {/* Efeito Aurora — Adaptado para Dark e Light mode para combinar com a Landing */}
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[#22c55e] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-20 dark:opacity-10 animate-pulse pointer-events-none z-0"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[60vh] bg-[#3b82f6] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-20 dark:opacity-10 animate-pulse delay-1000 pointer-events-none z-0"></div>

          {/* Fix #48/54: Sidebar envolto em Suspense (usa useSearchParams internamente) */}
          <Suspense fallback={<div className="w-64 bg-[#16181c] border-r border-[#2a2d34]" />}>
            <Sidebar collapsed={collapsed} onToggle={handleToggle} user={user} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
          </Suspense>

          {/* Overlay Mobile */}
          {mobileOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in duration-300"
              onClick={() => setMobileOpen(false)}
            />
          )}

          <div
            className={`flex-1 min-h-screen transition-all duration-300 relative z-10 
              ${mobileOpen ? 'overflow-hidden h-screen' : ''}
              ${collapsed ? 'md:ml-[68px]' : 'md:ml-64'} ml-0`}
          >
            <Navbar
              sidebarWidth={0}
              collapsed={collapsed}
              onToggle={handleToggle}
              onMobileToggle={() => setMobileOpen(!mobileOpen)}
            />
            <main className="h-[calc(100vh-52px)] overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}
