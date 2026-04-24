import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar autenticação
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('plano')
      .eq('id', authData.user.id)
      .single()

    if (userError || currentUser?.plano !== 'admin') {
      return NextResponse.json(
        { error: 'Permissão negada' },
        { status: 403 }
      )
    }

    // Obter parâmetros de paginação e busca
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    const offset = (page - 1) * limit

    // Construir query
    let query = supabase.from('users').select('*', { count: 'exact' })

    if (search) {
      query = query.ilike('email', `%${search}%`)
    }

    // Executar query
    const { data, error, count } = await query
      .order('criado_em', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        users: data,
        total: count,
        page,
        limit,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão de admin
    const { data: currentUser } = await supabase
      .from('users')
      .select('plano')
      .eq('id', authData.user.id)
      .single()

    if (currentUser?.plano !== 'admin') {
      return NextResponse.json(
        { error: 'Permissão negada' },
        { status: 403 }
      )
    }

    const { email, password, nome, plano } = await req.json()

    if (!email || !password || !nome) {
      return NextResponse.json(
        { error: 'Email, senha e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Criar usuário no Supabase Auth
    const { data: newAuthUser, error: authCreateError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authCreateError) {
      return NextResponse.json(
        { error: authCreateError.message },
        { status: 400 }
      )
    }

    // Criar registro na tabela users
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: newAuthUser.user.id,
        email,
        nome,
        plano: plano || 'free',
        status: 'ativo',
        email_verified: true,
      })
      .select()
      .single()

    if (insertError) {
      await supabase.auth.admin.deleteUser(newAuthUser.user.id)
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 400 }
      )
    }

    // Criar account entry
    await supabase
      .from('accounts')
      .insert({
        user_id: newAuthUser.user.id,
        limite_envios: 100,
      })

    return NextResponse.json(
      { user: newUser },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}