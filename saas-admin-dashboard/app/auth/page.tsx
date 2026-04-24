'use client'

import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#050505]">
        <div className="animate-spin h-10 w-10 border-4 border-[#22c55e] border-t-transparent rounded-full"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}