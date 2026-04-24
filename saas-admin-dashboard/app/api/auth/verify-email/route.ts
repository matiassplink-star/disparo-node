import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return redirectWithMessage('Token inválido.', 'error')
    }

    // Buscar usuário pelo token
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email_verify_token', token)
      .single()

    if (error || !user) {
      return redirectWithMessage('Token inválido ou já utilizado.', 'error')
    }

    // Verificar se expirou
    if (user.email_verify_expires && new Date(user.email_verify_expires) < new Date()) {
      return redirectWithMessage('Este link expirou. Faça login e solicite um novo email.', 'error')
    }

    // Verificar email + conceder 3 dias grátis
    const tresDias = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        acesso_ate: tresDias,
        email_verify_token: null,
        email_verify_expires: null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Erro ao verificar email:', updateError)
      return redirectWithMessage('Erro ao verificar email.', 'error')
    }

    return redirectWithMessage('Email verificado! Você ganhou 3 dias de acesso grátis. Faça login para começar.', 'success')
  } catch (error) {
    console.error('Erro:', error)
    return redirectWithMessage('Erro interno.', 'error')
  }
}

function redirectWithMessage(message: string, type: 'success' | 'error') {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const url = `${appUrl}/auth/login?verified=${type}&message=${encodeURIComponent(message)}`
  return NextResponse.redirect(url)
}