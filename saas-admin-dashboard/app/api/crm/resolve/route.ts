import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const { remoteJid } = await request.json()
    if (!remoteJid) return NextResponse.json({ error: 'remoteJid é obrigatório' }, { status: 400 })

    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')

    // 1. Marcar contato como resolvido
    const { error: contactError } = await supabase
      .from('contacts')
      .update({ chat_status: 'resolved' })
      .eq('user_id', user.id)
      .eq('phone', phone)

    if (contactError) throw contactError

    // 2. Tentar mover o card no Kanban para a coluna "Finalizado/Resolvido" se existir
    const { data: resolvedCol } = await supabase
      .from('crm_columns')
      .select('id')
      .eq('user_id', user.id)
      .ilike('title', '%resolvido%')
      .maybeSingle()

    if (resolvedCol) {
      await supabase
        .from('crm_cards')
        .update({ column_id: resolvedCol.id })
        .eq('user_id', user.id)
        .eq('contact_phone', phone)
    }

    return NextResponse.json({ success: true, status: 'resolved' })
  } catch (err) {
    console.error('[/api/crm/resolve] Erro:', err)
    return NextResponse.json({ error: 'Falha ao resolver atendimento' }, { status: 500 })
  }
}
