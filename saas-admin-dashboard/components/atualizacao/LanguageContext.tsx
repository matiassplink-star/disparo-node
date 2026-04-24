'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Language = 'pt' | 'en' | 'es'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    'nav.dashboard': 'Visão Geral',
    'nav.monitor': 'Monitor de Disparos',
    'nav.numbers': 'Conectar Números',
    'nav.contacts': 'Contatos',
    'nav.send': 'Disparo',
    'nav.extraction': 'Extração Grupos',
    'nav.cleaning': 'Limpeza de Lista',
    'nav.groups': 'Envio Grupos',
    'nav.addGroups': 'Adicionar a Grupos',
    'nav.reports': 'Relatórios',
    'nav.tutorials': 'Tutoriais',
    'nav.community': 'Comunidade',
    'nav.users': 'Usuários',
    'nav.settings': 'Configurações',
    'nav.logout': 'Sair',
    'nav.premium': 'Recurso Premium',
    'group.principal': 'Principal',
    'group.disparos': 'Disparos',
    'group.ferramentas': 'Ferramentas',
    'group.suporte': 'Suporte',
    'group.admin': 'Administração'
  },
  en: {
    'nav.dashboard': 'Overview',
    'nav.monitor': 'Shoot Monitor',
    'nav.numbers': 'Connect Numbers',
    'nav.contacts': 'Contacts',
    'nav.send': 'Shooting',
    'nav.extraction': 'Group Extraction',
    'nav.cleaning': 'List Cleaning',
    'nav.groups': 'Send to Groups',
    'nav.addGroups': 'Add to Groups',
    'nav.reports': 'Reports',
    'nav.tutorials': 'Tutorials',
    'nav.community': 'Community',
    'nav.users': 'Users',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'nav.premium': 'Premium Feature',
    'group.principal': 'Main',
    'group.disparos': 'Shooting',
    'group.ferramentas': 'Tools',
    'group.suporte': 'Support',
    'group.admin': 'Administration'
  },
  es: {
    'nav.dashboard': 'Visión General',
    'nav.monitor': 'Monitor de Envíos',
    'nav.numbers': 'Conectar Números',
    'nav.contacts': 'Contactos',
    'nav.send': 'Envío',
    'nav.extraction': 'Extracción de Grupos',
    'nav.cleaning': 'Limpieza de Lista',
    'nav.groups': 'Envío a Grupos',
    'nav.addGroups': 'Añadir a Grupos',
    'nav.reports': 'Reportes',
    'nav.tutorials': 'Tutoriales',
    'nav.community': 'Comunidad',
    'nav.users': 'Usuarios',
    'nav.settings': 'Configuraciones',
    'nav.logout': 'Salir',
    'nav.premium': 'Función Premium',
    'group.principal': 'Principal',
    'group.disparos': 'Envíos',
    'group.ferramentas': 'Herramientas',
    'group.suporte': 'Soporte',
    'group.admin': 'Administración'
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pt')

  useEffect(() => {
    const saved = localStorage.getItem('zaplink-language') as Language
    if (saved && ['pt', 'en', 'es'].includes(saved)) {
      setLanguageState(saved)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('zaplink-language', lang)
    
    // Notificar o iframe também
    const iframe = document.querySelector('iframe')
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ action: 'setLanguage', language: lang }, '*')
    }
  }

  const t = (key: string): string => {
    return translations[language][key] || translations['pt'][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
