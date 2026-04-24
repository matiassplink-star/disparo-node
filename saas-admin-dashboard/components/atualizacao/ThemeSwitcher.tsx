'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Sincronizar tema com o iframe sempre que o tema mudar ou o componente montar
    const syncTheme = () => {
      const iframe = document.querySelector('iframe')
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ action: 'setTheme', theme: theme }, '*')
      }
    }
    
    syncTheme()
    // Pequeno delay para garantir que o iframe carregou
    const timer = setTimeout(syncTheme, 1000)
    return () => clearTimeout(timer)
  }, [theme, mounted])

  if (!mounted) {
    return <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-xl transition-all flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/10"
      title={theme === 'dark' ? 'Mudar para Claro' : 'Mudar para Escuro'}
    >
      {theme === 'dark' ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
    </button>

  )
}
