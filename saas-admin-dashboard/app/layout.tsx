import React from 'react'
import type { Metadata } from 'next'
import './globals.css'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'ZapLink — Automação e Disparos em Massa no WhatsApp',
  description: 'O ZapLink é a ferramenta definitiva para vender no automático. Rotação anti-ban, IA (ChatGPT), extração de grupos e monitor em tempo real.',
  keywords: ['disparo em massa whatsapp', 'automação whatsapp', 'marketing whatsapp', 'vendas automático', 'zaplink', 'bot whatsapp'],
  authors: [{ name: 'ZapLink Team' }],
  openGraph: {
    title: 'ZapLink — Automação e Disparos em Massa no WhatsApp',
    description: 'Sistema profissional para escala de vendas. Comece grátis!',
    url: 'https://zaplink.com.br',
    siteName: 'ZapLink',
    images: [
      {
        url: 'https://zaplink.com.br/og-image.png',
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
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased selection:bg-green-500/30">
        {children}
      </body>
    </html>
  )
}