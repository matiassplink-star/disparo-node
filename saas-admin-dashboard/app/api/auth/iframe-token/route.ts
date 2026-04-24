import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = req.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    // Validar acesso do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('plano, acesso_ate')
      .eq('id', user.id)
      .single()

    if (!userData) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const isAdmin = userData.plano === 'admin'
    const isPro = userData.plano === 'pro'
    const acessoAtivo = isAdmin || isPro || (userData.acesso_ate && new Date(userData.acesso_ate) > new Date())

    if (!acessoAtivo) {
      console.log(`[AUTH-BLOCK] Usuário ${user.id} bloqueado. Plano: ${userData.plano}, Expira em: ${userData.acesso_ate}`);
      return NextResponse.json({ error: 'Acesso expirado ou não liberado. Entre em contato com o suporte.' }, { status: 403 })
    }

    // Gerar token seguro para o iframe (HMAC do userId + timestamp + plano)
    const secret = process.env.WA_AUTH_TOKEN || 'disparo-saas-2025'
    const expires = Date.now() + 1000 * 60 * 60 // 1 hora de validade
    const payload = `${user.id}:${expires}:${userData.plano}`
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    
    const iframeToken = `${payload}:${signature}`

    return NextResponse.json({ iframeToken })
  } catch (error) {
    console.error('Erro ao gerar iframe token:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
