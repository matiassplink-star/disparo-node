import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — listar tutoriais
export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('tutoriais')
      .select('*')
      .order('ordem', { ascending: true })
      .order('criado_em', { ascending: true })

    if (error) throw error

    return NextResponse.json({ tutoriais: data || [] })
  } catch (error) {
    console.error('Erro ao listar tutoriais:', error)
    return NextResponse.json({ error: 'Erro ao buscar tutoriais' }, { status: 500 })
  }
}

// POST — criar tutorial (admin only)
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = req.cookies.get('sb-access-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const { data: { user: authUser } } = await supabase.auth.getUser(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('plano')
      .eq('id', authUser.id)
      .single()

    if (!userData || userData.plano !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { titulo, descricao, youtube_url, categoria, nivel_acesso } = await req.json()

    if (!titulo || !youtube_url) {
      return NextResponse.json({ error: 'Título e URL são obrigatórios' }, { status: 400 })
    }

    // Pegar próxima ordem
    const { data: last } = await supabase
      .from('tutoriais')
      .select('ordem')
      .order('ordem', { ascending: false })
      .limit(1)
      .maybeSingle()

    const ordem = (last?.ordem || 0) + 1

    const { data, error } = await supabase
      .from('tutoriais')
      .insert({
        titulo,
        descricao: descricao || '',
        youtube_url,
        ordem,
        categoria: categoria || 'Geral',
        nivel_acesso: nivel_acesso || 'free'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar tutorial:', error)
    return NextResponse.json({ error: 'Erro ao criar tutorial' }, { status: 500 })
  }
}
