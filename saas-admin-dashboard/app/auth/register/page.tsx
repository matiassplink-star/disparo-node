import { RegisterForm } from '@/components/auth/RegisterForm'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: '#0e0f11' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span className="text-base font-bold tracking-widest" style={{ color: '#e8eaed', fontFamily: "'DM Mono', monospace" }}>ZAPLINK</span>
          </Link>
          <h2 className="text-xl font-bold" style={{ color: '#e8eaed' }}>Criar sua conta</h2>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Ganhe 3 dias grátis ao se cadastrar</p>
        </div>
        <div className="rounded-xl p-6" style={{ background: '#16181c', border: '1px solid #2a2d34' }}>
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
