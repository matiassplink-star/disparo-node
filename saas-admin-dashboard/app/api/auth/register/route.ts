import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

// Domínios de email descartáveis (anti-abuso)
const DISPOSABLE_DOMAINS = new Set([
  'guerrillamail.com','guerrillamail.info','grr.la','guerrillamailblock.com',
  'tempmail.com','temp-mail.org','tempail.com','tempr.email','tempmailo.com',
  'yopmail.com','yopmail.fr','yopmail.net','cool.fr.nf','jetable.fr.nf',
  'nospam.ze.tc','nomail.xl.cx','mega.zik.dj','speed.1s.fr','courriel.fr.nf',
  'moncourrier.fr.nf','mailinator.com','mailinator.net','mailinator2.com',
  'maildrop.cc','dispostable.com','sharklasers.com','guerrillamailblock.com',
  'grr.la','disposableemailaddresses.emailmiser.com','gishpuppy.com',
  'fakeinbox.com','trashymail.com','mailnesia.com','binkmail.com',
  'safetymail.info','tempomail.fr','discard.email','discardmail.com',
  'discardmail.de','emailondeck.com','33mail.com','maildrop.cc','mailnull.com',
  'mytemp.email','throwaway.email','trashmail.com','trashmail.me','trashmail.net',
  'wegwerfmail.de','wegwerfmail.net','wh4f.org','mailcatch.com','mailscrap.com',
  'mohmal.com','burnermail.io','inboxbear.com','mailsac.com','10minutemail.com',
  'minutemail.com','emailfake.com','email-fake.com','crazymailing.com',
  'tempinbox.com','mailtemp.info','throwam.com','getnada.com','emailna.co',
])

export async function POST(req: NextRequest) {
  try {
    const { email, password, nome, telefone } = await req.json()

    if (!email || !password || !nome) {
      return NextResponse.json(
        { error: 'Email, senha e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    // Validação de senha
    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    // Anti-abuso: bloquear emails descartáveis
    const emailDomain = email.split('@')[1]?.toLowerCase()
    if (DISPOSABLE_DOMAINS.has(emailDomain)) {
      return NextResponse.json(
        { error: 'Este provedor de email não é permitido. Use um email real.' },
        { status: 400 }
      )
    }

    // Anti-abuso: verificar IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: recentRegistros } = await supabase
      .from('registros_ip')
      .select('id')
      .eq('ip', ip)
      .gte('criado_em', twentyFourHoursAgo)

    if (recentRegistros && recentRegistros.length >= 3) {
      return NextResponse.json(
        { error: 'Muitas contas criadas recentemente. Tente novamente em 24 horas.' },
        { status: 429 }
      )
    }

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 400 })
    }

    // Gerar token de verificação de email
    const verifyToken = crypto.randomBytes(32).toString('hex')
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h

    // Criar usuário no Supabase Auth
    const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Remover verificação de e-mail por enquanto e dar 3 dias diretos
    const tresDias = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    // Criar registro na tabela users (email verificado, com 3 dias grátis)
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .upsert({
        id: newAuthUser.user.id,
        email: email.toLowerCase(),
        nome,
        telefone: telefone || null,
        plano: 'free',
        status: 'ativo',
        email_verified: true, // Bypass verification
        acesso_ate: tresDias, // Dá 3 dias grátis imediatamente
        email_verify_token: verifyToken,
        email_verify_expires: verifyExpires,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error users:', insertError)
      await supabase.auth.admin.deleteUser(newAuthUser.user.id)
      return NextResponse.json({ error: 'Erro ao criar usuário: ' + insertError.message }, { status: 400 })
    }

    // Criar account entry (se existir trigger, o upsert não duplica)
    await supabase
      .from('accounts')
      .upsert({
        user_id: newAuthUser.user.id,
        limite_envios: 100,
      }, { onConflict: 'user_id' })

    // Registrar IP (anti-abuso)
    await supabase
      .from('registros_ip')
      .insert({
        ip,
        email: email.toLowerCase(),
        user_agent: req.headers.get('user-agent') || 'unknown',
      })

    // Ocultado: Integração com Resend foi desativada a pedido do usuário
    // para não travar o fluxo de criação de contas.

    return NextResponse.json(
      {
        message: 'Conta criada com sucesso! Você ganhou 3 dias grátis.',
        requiresVerification: false, // Alterado para não travar na tela de aviso
        user: { id: newUser.id, email: newUser.email, nome: newUser.nome }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao registrar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}