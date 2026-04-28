import React from 'react'
import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'ZapLink — Automação e Disparos em Massa no WhatsApp (Anti-Ban)',
  description: 'A ferramenta definitiva para vender no automático. Rotação anti-ban, IA (ChatGPT), extração de grupos e filtro de números WhatsApp. Comece agora!',
  keywords: [
    'zaplink', 'disparo em massa whatsapp', 'automação whatsapp', 'marketing whatsapp', 
    'vendas automático', 'extrator de grupos whatsapp', 'filtro de números whatsapp',
    'rotação anti-ban whatsapp', 'agente sdr ia', 'bot para whatsapp', 'limpeza de lista whatsapp'
  ],
  authors: [{ name: 'ZapLink Team' }],
  openGraph: {
    title: 'ZapLink — Automação e Disparos em Massa no WhatsApp',
    description: 'Sistema profissional para escala de vendas. Comece grátis!',
    url: 'https://zaplink.casabrokersistema.online',
    siteName: 'ZapLink',
    images: [
      {
        url: 'https://zaplink.casabrokersistema.online/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={dmSans.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`antialiased selection:bg-green-500/30 ${dmSans.className}`}>
        {children}
      </body>
    </html>
  )
}