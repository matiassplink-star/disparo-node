import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// Limpa sufixos internos do WhatsApp
function cleanJid(jid: string): string {
  return jid
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace('@lid', '')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    // Busca contatos do usuário
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, phone, name, chat_status, tags, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (contactsError) throw contactsError
    if (!contacts || contacts.length === 0) return NextResponse.json([])

    // Busca a última mensagem por remote_jid, de forma eficiente:
    // Agrupa por remote_jid pegando apenas a mais recente (DISTINCT ON via subquery não é suportado,
    // então buscamos as mensagens ordenadas e mapeamos em JS apenas 1x por jid)
    const { data: latestMsgs, error: msgsError } = await supabase
      .from('messages')
      .select('remote_jid, content, created_at, from_me, message_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2000) // limita para performance

    if (msgsError) throw msgsError

    // Indexa a última mensagem por remote_jid (O(n) única vez)
    const lastMsgByJid = new Map<string, Record<string, unknown>>()
    for (const msg of latestMsgs ?? []) {
      const jid = msg.remote_jid as string
      if (!lastMsgByJid.has(jid)) {
        lastMsgByJid.set(jid, msg as Record<string, unknown>)
      }
    }

    // Monta os chats
    const chats = contacts
      .map((c: Record<string, unknown>) => {
        const phone = c.phone as string
        const rawName = (c.name as string) || phone
        const cleanName = rawName.includes('@') ? cleanJid(rawName) : rawName
        const cleanPhone = phone.includes('@') ? cleanJid(phone) : phone

        // Tenta encontrar a última mensagem pelo phone exato, ou pela versão limpa
        const lastMessage = lastMsgByJid.get(phone) || lastMsgByJid.get(cleanPhone) || null

        return {
          id: c.id,
          remote_jid: phone,
          name: cleanName || cleanPhone,
          chat_status: c.chat_status,
          lastMessage,
          updated_at: lastMessage
            ? (lastMessage.created_at as string)
            : (c.created_at as string),
          tags: (c.tags as string[]) || [],
        }
      })
      .filter(c => c.lastMessage !== null)
      .sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )

    return NextResponse.json(chats)

  } catch (err) {
    console.error('[/api/whatsapp/chats] Erro:', err)
    return NextResponse.json({ error: 'Falha ao carregar chats' }, { status: 500 })
  }
}
