'use client'

import { Suspense } from 'react'
import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm'

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#050505]">
        <div className="animate-spin h-10 w-10 border-4 border-[#22c55e] border-t-transparent rounded-full"></div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  )
}
