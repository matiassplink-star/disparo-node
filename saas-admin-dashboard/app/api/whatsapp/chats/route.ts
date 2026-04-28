import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    // Busca TODOS os contatos que têm mensagens (sem filtro de chat_status)
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select(`
        *,
        messages:messages(content, created_at, from_me, message_type)
      `)
      .eq('user_id', user.id)
      .order('created_at', { foreignTable: 'messages', ascending: false })
      .limit(1, { foreignTable: 'messages' })

    if (error) throw error

    // Formata o retorno
    const chats = contacts?.map((c: any) => ({
      id: c.id,
      remote_jid: c.phone,
      name: c.name || c.phone,
      chat_status: c.chat_status,
      lastMessage: c.messages && c.messages.length > 0 ? c.messages[0] : null,
      updated_at: c.messages && c.messages.length > 0 ? c.messages[0].created_at : c.created_at,
      tags: c.tags || []
    })).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    return NextResponse.json(chats || [])

  } catch (err: any) {
    console.error('[/api/whatsapp/chats] Erro:', err)
    return NextResponse.json({ error: 'Falha ao carregar chats' }, { status: 500 })
  }
}
