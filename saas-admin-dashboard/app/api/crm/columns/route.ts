import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function getAuth(request: NextRequest) {
  return request.cookies.get('sb-access-token')?.value
}

// GET /api/crm/columns → lista colunas do usuário
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = getAuth(request)
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const { data: columns, error } = await supabase
      .from('crm_columns')
      .select(`
        *,
        cards:crm_cards(
          id, contact_phone, contact_name, notes, position, value, expected_close_date, created_at,
          column_id
        )
      `)
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    if (error) throw error

    // Ordenar cards por position dentro de cada coluna
    const columnsWithSortedCards = columns?.map(col => ({
      ...col,
      cards: (col.cards || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    }))

    return NextResponse.json(columnsWithSortedCards || [])
  } catch (err) {
    console.error('[/api/crm/columns GET]', err)
    return NextResponse.json({ error: 'Falha ao carregar colunas' }, { status: 500 })
  }
}

// POST /api/crm/columns → cria nova coluna
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = getAuth(request)
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const { title, color } = await request.json()
    if (!title) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

    // Pega o maior position atual
    const { data: lastCol } = await supabase
      .from('crm_columns')
      .select('position')
      .eq('user_id', user.id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPosition = lastCol ? lastCol.position + 1 : 0

    const { data, error } = await supabase
      .from('crm_columns')
      .insert({ user_id: user.id, title, color: color || '#3b82f6', position: nextPosition })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/crm/columns POST]', err)
    return NextResponse.json({ error: 'Falha ao criar coluna' }, { status: 500 })
  }
}
