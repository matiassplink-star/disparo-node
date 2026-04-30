import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

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

    // Usa a view v_chat_list que aplica DISTINCT ON no banco
    // Muito mais eficiente que carregar todas as mensagens em JS
    // Usa a view v_chat_list que aplica DISTINCT ON no banco
    const { data: rows, error } = await supabase
      .from('v_chat_list')
      .select('*')
      .eq('user_id', user.id)
      .not('remote_jid', 'like', '%@g.us')
      .not('remote_jid', 'eq', 'status@broadcast')
      .order('last_message_at', { ascending: false })
      .limit(200)

    if (error) {
      // Fallback: se a view ainda não foi criada, usa a lógica Map anterior
      console.warn('[chats] view v_chat_list não encontrada, usando fallback:', error.message)
      return fallbackChats(supabase, user.id)
    }

    const chats = (rows ?? []).map((row: Record<string, unknown>) => {
      const rawName = (row.contact_name as string) || (row.remote_jid as string)
      const cleanName = rawName?.includes('@') ? cleanJid(rawName) : rawName
      const rawPhone = (row.contact_phone as string) || (row.remote_jid as string)
      const cleanPhone = rawPhone?.includes('@') ? cleanJid(rawPhone) : rawPhone

      return {
        id: row.contact_id || row.remote_jid,
        remote_jid: cleanPhone,
        name: cleanName || cleanPhone,
        chat_status: row.chat_status || 'open',
        ai_active: row.ai_active !== false,
        tags: (row.tags as string[]) || [],
        lastMessage: {
          content: row.last_message,
          from_me: row.last_from_me,
          created_at: row.last_message_at,
          message_type: row.last_message_type,
        },
        updated_at: row.last_message_at,
      }
    })

    return NextResponse.json(chats)

  } catch (err) {
    console.error('[/api/whatsapp/chats] Erro:', err)
    return NextResponse.json({ error: 'Falha ao carregar chats' }, { status: 500 })
  }
}

// ─── Fallback: lógica anterior com Map (caso a view não exista ainda) ───
async function fallbackChats(
  supabase: ReturnType<typeof import('@/lib/supabase').getSupabase>,
  userId: string
) {
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, phone, name, chat_status, ai_active, tags, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!contacts?.length) return NextResponse.json([])

  const { data: latestMsgs } = await supabase
    .from('messages')
    .select('remote_jid, content, created_at, from_me, message_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(2000)

  const lastMsgByJid = new Map<string, Record<string, unknown>>()
  for (const msg of latestMsgs ?? []) {
    if (!lastMsgByJid.has(msg.remote_jid as string)) {
      lastMsgByJid.set(msg.remote_jid as string, msg as Record<string, unknown>)
    }
  }

  const cleanJid = (jid: string) =>
    jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')

  const chats = contacts
    .map((c: Record<string, unknown>) => {
      const phone = c.phone as string
      const rawName = (c.name as string) || phone
      const cleanName = rawName.includes('@') ? cleanJid(rawName) : rawName
      const cleanPhone = phone.includes('@') ? cleanJid(phone) : phone
      const lastMessage = lastMsgByJid.get(phone) || lastMsgByJid.get(cleanPhone) || null
      return {
        id: c.id,
        remote_jid: phone,
        name: cleanName || cleanPhone,
        chat_status: c.chat_status,
        ai_active: c.ai_active !== false,
        lastMessage,
        updated_at: lastMessage ? (lastMessage.created_at as string) : (c.created_at as string),
        tags: (c.tags as string[]) || [],
      }
    })
    .filter(c => c.lastMessage !== null)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  return NextResponse.json(chats)
}
