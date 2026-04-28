import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    // 1. Busca os contatos do usuário
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)

    if (contactsError) throw contactsError

    if (!contacts || contacts.length === 0) {
      return NextResponse.json([])
    }

    // 2. Para cada contato, buscar a última mensagem manualmente
    // Como Supabase PostgREST não suporta JOIN sem Foreign Key (messages -> contacts),
    // vamos buscar as mensagens mais recentes deste usuário
    const { data: allMessages, error: msgsError } = await supabase
      .from('messages')
      .select('remote_jid, content, created_at, from_me, message_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (msgsError) throw msgsError

    // 3. Formata o retorno mapeando a última mensagem de cada contato
    const chats = contacts.map((c: any) => {
      // Encontra a primeira mensagem (mais recente) que bate com o remote_jid
      const lastMessage = allMessages?.find(m => m.remote_jid === c.phone) || null

      return {
        id: c.id,
        remote_jid: c.phone,
        name: c.name || c.phone,
        chat_status: c.chat_status,
        lastMessage,
        updated_at: lastMessage ? lastMessage.created_at : c.created_at,
        tags: c.tags || []
      }
    })
    // Filtra os que tem mensagem e ordena pelos mais recentes
    .filter(c => c.lastMessage)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    return NextResponse.json(chats || [])

  } catch (err: any) {
    console.error('[/api/whatsapp/chats] Erro:', err)
    return NextResponse.json({ error: 'Falha ao carregar chats' }, { status: 500 })
  }
}
