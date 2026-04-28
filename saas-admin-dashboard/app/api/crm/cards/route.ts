import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

function getAuth(request: NextRequest) {
  return request.cookies.get('sb-access-token')?.value
}

// POST /api/crm/cards → cria novo card
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = getAuth(request)
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const { column_id, contact_phone, contact_name, notes, value } = await request.json()
    if (!column_id || !contact_phone) {
      return NextResponse.json({ error: 'column_id e contact_phone obrigatórios' }, { status: 400 })
    }

    // Pega o maior position atual na coluna
    const { data: lastCard } = await supabase
      .from('crm_cards')
      .select('position')
      .eq('column_id', column_id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPosition = lastCard ? lastCard.position + 1 : 0

    const { data, error } = await supabase
      .from('crm_cards')
      .insert({
        user_id: user.id,
        column_id,
        contact_phone,
        contact_name: contact_name || contact_phone,
        notes: notes || '',
        position: nextPosition,
        value: value || 0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/crm/cards POST]', err)
    return NextResponse.json({ error: 'Falha ao criar card' }, { status: 500 })
  }
}

// PATCH /api/crm/cards → move card ou atualiza dados
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = getAuth(request)
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const body = await request.json()
    const { id, column_id, position, notes, value, contact_name } = body

    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    const updateData: Record<string, unknown> = {}
    if (column_id !== undefined) updateData.column_id = column_id
    if (position !== undefined) updateData.position = position
    if (notes !== undefined) updateData.notes = notes
    if (value !== undefined) updateData.value = value
    if (contact_name !== undefined) updateData.contact_name = contact_name

    const { data, error } = await supabase
      .from('crm_cards')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/crm/cards PATCH]', err)
    return NextResponse.json({ error: 'Falha ao atualizar card' }, { status: 500 })
  }
}

// DELETE /api/crm/cards?id=xxx → remove card
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = getAuth(request)
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    const { error } = await supabase
      .from('crm_cards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/crm/cards DELETE]', err)
    return NextResponse.json({ error: 'Falha ao remover card' }, { status: 500 })
  }
}
