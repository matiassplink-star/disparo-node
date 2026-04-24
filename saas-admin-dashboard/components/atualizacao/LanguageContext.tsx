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
    'nav.whatsapp': 'Monitor de Disparos',
    'nav.connect': 'Conectar Números',
    'nav.contacts': 'Contatos',
    'nav.shoot': 'Disparo',
    'nav.extract': 'Extração Grupos',
    'nav.clean': 'Limpeza de Lista',
    'nav.send_group': 'Envio Grupos',
    'nav.add_group': 'Adicionar a Grupos',
    'nav.reports': 'Relatórios',
    'nav.tutorials': 'Tutoriais',
    'nav.community': 'Comunidade',
    'nav.users': 'Usuários',
    'nav.settings': 'Configurações',
    'nav.logout': 'Sair',
    'nav.premium': 'Recurso Premium',
    'group.main': 'Principal',
    'group.shoots': 'Disparos',
    'group.tools': 'Ferramentas',
    'group.support': 'Suporte',
    'group.admin': 'Administração'
  },
  en: {
    'nav.dashboard': 'Overview',
    'nav.whatsapp': 'Shoot Monitor',
    'nav.connect': 'Connect Numbers',
    'nav.contacts': 'Contacts',
    'nav.shoot': 'Shooting',
    'nav.extract': 'Group Extraction',
    'nav.clean': 'List Cleaning',
    'nav.send_group': 'Send to Groups',
    'nav.add_group': 'Add to Groups',
    'nav.reports': 'Reports',
    'nav.tutorials': 'Tutorials',
    'nav.community': 'Community',
    'nav.users': 'Users',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'nav.premium': 'Premium Feature',
    'group.main': 'Main',
    'group.shoots': 'Shooting',
    'group.tools': 'Tools',
    'group.support': 'Support',
    'group.admin': 'Administration'
  },
  es: {
    'nav.dashboard': 'Visión General',
    'nav.whatsapp': 'Monitor de Envíos',
    'nav.connect': 'Conectar Números',
    'nav.contacts': 'Contactos',
    'nav.shoot': 'Envío',
    'nav.extract': 'Extracción de Grupos',
    'nav.clean': 'Limpieza de Lista',
    'nav.send_group': 'Envío a Grupos',
    'nav.add_group': 'Añadir a Grupos',
    'nav.reports': 'Reportes',
    'nav.tutorials': 'Tutoriales',
    'nav.community': 'Comunidad',
    'nav.users': 'Usuarios',
    'nav.settings': 'Configuraciones',
    'nav.logout': 'Salir',
    'nav.premium': 'Función Premium',
    'group.main': 'Principal',
    'group.shoots': 'Envíos',
    'group.tools': 'Herramientas',
    'group.support': 'Soporte',
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
