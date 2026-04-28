import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getChats, getMessages } from '@/lib/evolution-api'

/**
 * POST /api/whatsapp/sync
 * Busca todos os chats + últimas mensagens direto na Evolution API
 * e os salva no banco. Solução para quando o webhook não está funcionando.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    // Pegar instância ativa
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!instance) {
      return NextResponse.json({ error: 'Nenhuma instância encontrada' }, { status: 404 })
    }

    // Buscar chats da Evolution API
    const chats = await getChats(instance.instance_name)

    if (!Array.isArray(chats) || chats.length === 0) {
      return NextResponse.json({ synced: 0, message: 'Nenhum chat encontrado na Evolution API' })
    }

    let syncedChats = 0
    let syncedMessages = 0

    // Ordenar pelos mais recentes e filtrar individuais
    const individualChats = chats
      .filter((c: Record<string, unknown>) => {
        const jid = (c.remoteJid as string) || ''
        return jid && !jid.endsWith('@g.us') && !jid.endsWith('@broadcast')
      })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const ta = new Date((a.updatedAt as string) || 0).getTime()
        const tb = new Date((b.updatedAt as string) || 0).getTime()
        return tb - ta
      })

    for (const chat of individualChats) {
      // Usar remoteJid real — não o id interno da Evolution
      const remoteJid = (chat.remoteJid as string) || ''
      if (!remoteJid) continue

      const phone = remoteJid
        .replace('@s.whatsapp.net', '')
        .replace('@c.us', '')
        .replace('@lid', '')

      // pushName = nome real do contato
      const name: string = (chat.pushName as string) || (chat.name as string) || phone

      // Upsert contato
      await supabase
        .from('contacts')
        .upsert(
          { user_id: user.id, instance_id: instance.id, phone, name, chat_status: 'open' },
          { onConflict: 'user_id,phone', ignoreDuplicates: false }
        )

      syncedChats++

      // Buscar últimas mensagens deste chat
      const msgs = await getMessages(instance.instance_name, remoteJid, 30)

      for (const msg of msgs) {
        const messageText =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          msg.body ||
          ''

        if (!messageText && !msg.hasMedia) continue

        const fromMe: boolean = msg.key?.fromMe ?? msg.fromMe ?? false
        const externalId: string | null = msg.key?.id || msg.id || null
        const ts: number | undefined = msg.messageTimestamp
        const createdAt = ts ? new Date(ts * 1000).toISOString() : new Date().toISOString()

        await supabase.from('messages').upsert(
          {
            user_id: user.id,
            instance_id: instance.id,
            remote_jid: phone,
            external_id: externalId,
            content: messageText || '[Mídia]',
            from_me: fromMe,
            message_type: 'text',
            status: 'sent',
            created_at: createdAt,
          },
          {
            onConflict: externalId ? 'user_id,external_id' : 'id',
            ignoreDuplicates: true,
          }
        )
        syncedMessages++
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedChats,
      messages: syncedMessages,
      message: `${syncedChats} conversas e ${syncedMessages} mensagens sincronizadas.`,
    })

  } catch (err) {
    console.error('[/api/whatsapp/sync] Erro:', err)
    return NextResponse.json({ error: 'Falha na sincronização' }, { status: 500 })
  }
}
