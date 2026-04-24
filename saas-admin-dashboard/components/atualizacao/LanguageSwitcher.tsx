'use client'

import { useLanguage } from './LanguageContext'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as 'pt' | 'en' | 'es')}
      className="bg-transparent text-[#8b949e] hover:text-white text-xs font-medium cursor-pointer focus:outline-none ml-2"
    >
      <option value="pt" className="bg-[#16181c] text-white">🇧🇷 PT</option>
      <option value="en" className="bg-[#16181c] text-white">🇺🇸 EN</option>
      <option value="es" className="bg-[#16181c] text-white">🇪🇸 ES</option>
    </select>
  )
}
