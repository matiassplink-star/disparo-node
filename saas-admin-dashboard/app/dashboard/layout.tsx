'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Navbar } from '@/components/dashboard/Navbar'
import { User } from '@/types'
import { usePathname, useRouter } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
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
  const sidebarWidth = collapsed ? 68 : 256

  // Proteção de rotas para usuários comuns
  if (!isAdmin) {
    const rotasPermitidas = ['/dashboard', '/dashboard/whatsapp', '/dashboard/tutoriais', '/dashboard/perfil']
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
    <div className="flex min-h-screen relative overflow-hidden bg-[#050505]">
      {/* Efeito Aurora Global */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[#22c55e] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-pulse pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[60vh] bg-[#8b5cf6] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-pulse delay-1000 pointer-events-none z-0"></div>

      <Sidebar collapsed={collapsed} onToggle={handleToggle} user={user} />
      
      <div
        className="flex-1 min-h-screen transition-all duration-300 relative z-10"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Navbar sidebarWidth={0} />
        <main className="h-[calc(100vh-52px)] overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
