'use client'

import { useLanguage } from './LanguageContext'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const flags: Record<string, string> = {
    pt: '🇧🇷',
    en: '🇺🇸',
    es: '🇪🇸'
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
      {(Object.keys(flags) as Array<keyof typeof flags>).map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang as 'pt' | 'en' | 'es')}
          className={`text-xl p-1 rounded-md transition-all hover:scale-110 ${
            language === lang 
              ? 'bg-white dark:bg-white/10 shadow-sm scale-110 ring-1 ring-green-500/50' 
              : 'opacity-40 hover:opacity-100 grayscale hover:grayscale-0'
          }`}
          title={lang.toUpperCase()}
        >
          {flags[lang]}
        </button>
      ))}
    </div>
  )
}
