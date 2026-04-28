import { LoginForm } from '@/components/auth/LoginForm'
import Link from 'next/link'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#050505]">
      {/* Efeito Aurora */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[#22c55e] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[60vh] bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-pulse delay-1000 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 transition-transform hover:scale-105">
            <div className="w-3.5 h-3.5 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 15px #22c55e' }} />
            <span className="text-2xl font-black tracking-[0.2em] font-mono text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">ZAPLINK</span>
          </Link>
        </div>
        
        <div className="rounded-3xl p-8 bg-[#16181c]/80 backdrop-blur-xl border border-white/5 shadow-2xl">
          <Suspense fallback={<div className="text-center py-4 text-[#6b7280]">Carregando...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
