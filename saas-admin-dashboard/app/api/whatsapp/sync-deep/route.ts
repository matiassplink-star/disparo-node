import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getChats, getMessages } from '@/lib/evolution-api'

/**
 * POST /api/whatsapp/sync-deep
 * Sincronização Profunda: busca as conversas mais recentes da Evolution API.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!instance) {
      return NextResponse.json({ error: 'Nenhuma instância encontrada' }, { status: 404 })
    }

    const chats = await getChats(instance.instance_name)

    if (!Array.isArray(chats) || chats.length === 0) {
      return NextResponse.json({
        synced: 0,
        messages: 0,
        message: 'Nenhum chat encontrado. Verifique se o WhatsApp está conectado.',
      })
    }

    // ── Filtrar chats individuais e ordenar pelos mais recentes ──
    const individualChats = chats
      .filter((c: Record<string, unknown>) => {
        // Usar remoteJid (JID real) — não o id interno da Evolution
        const jid = (c.remoteJid as string) || ''
        return jid && !jid.endsWith('@g.us') && !jid.endsWith('@broadcast')
      })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        // Ordenar pelos mais recentes primeiro (updatedAt)
        const ta = new Date((a.updatedAt as string) || 0).getTime()
        const tb = new Date((b.updatedAt as string) || 0).getTime()
        return tb - ta
      })
      .slice(0, 50) // Máximo 50 para não dar timeout no Vercel

    let syncedChats = 0
    let syncedMessages = 0

    for (const chat of individualChats) {
      // ─── Usar remoteJid real (não o id interno) ───
      const remoteJid = (chat.remoteJid as string) || ''
      if (!remoteJid) continue

      const phone = remoteJid
        .replace('@s.whatsapp.net', '')
        .replace('@c.us', '')
        .replace('@lid', '')

      // pushName = nome real do contato no WhatsApp
      const name: string = (chat.pushName as string) || (chat.name as string) || phone

      await supabase
        .from('contacts')
        .upsert(
          { user_id: user.id, instance_id: instance.id, phone, name, chat_status: 'open' },
          { onConflict: 'user_id,phone', ignoreDuplicates: false }
        )

      syncedChats++

      // ─── Salvar a última mensagem do chat (que vem no findChats) ───
      const lastMsg = chat.lastMessage as Record<string, unknown> | undefined
      if (lastMsg) {
        const msgContent = lastMsg.message as Record<string, unknown> | undefined
        const extText = (msgContent?.extendedTextMessage as Record<string, unknown>)?.text as string | undefined
        const imageCaption = (msgContent?.imageMessage as Record<string, unknown>)?.caption as string | undefined
        const videoCaption = (msgContent?.videoMessage as Record<string, unknown>)?.caption as string | undefined
        
        const lastMessageText =
          (msgContent?.conversation as string) ||
          extText || imageCaption || videoCaption ||
          (lastMsg.body as string) || ''
          
        if (lastMessageText || (lastMsg.hasMedia)) {
          const key = lastMsg.key as Record<string, unknown> | undefined
          const fromMe = (key?.fromMe as boolean) ?? false
          const externalId = (key?.id as string) || null
          const ts = lastMsg.messageTimestamp as number | undefined
          const createdAt = ts ? new Date(ts * 1000).toISOString() : new Date().toISOString()
          
          await supabase.from('messages').upsert(
            {
              user_id: user.id,
              instance_id: instance.id,
              remote_jid: phone,
              external_id: externalId,
              content: lastMessageText || '[Mídia]',
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

      // ─── Mensagens: tentar buscar histórico (com filtro estrito) ───
      const msgs = await getMessages(instance.instance_name, remoteJid, 50)

      if (!Array.isArray(msgs)) continue

      for (const msg of msgs) {
        // Validação ESTREMA: Evolution API tem bug e pode retornar msgs globais!
        const msgKey = msg.key as Record<string, unknown> | undefined
        const msgJid = (msgKey?.remoteJid as string) || (msg.remoteJid as string) || ''
        
        if (msgJid && msgJid !== remoteJid) {
          // Ignora mensagens vazadas de outras conversas/grupos
          continue
        }

        const msgContent = msg.message as Record<string, unknown> | undefined
        const extText = (msgContent?.extendedTextMessage as Record<string, unknown>)?.text as string | undefined
        const imageCaption = (msgContent?.imageMessage as Record<string, unknown>)?.caption as string | undefined
        const videoCaption = (msgContent?.videoMessage as Record<string, unknown>)?.caption as string | undefined

        const messageText =
          (msgContent?.conversation as string) ||
          extText || imageCaption || videoCaption ||
          (msg.body as string) || ''

        if (!messageText && !msg.hasMedia) continue

        const fromMe = (msgKey?.fromMe as boolean) ?? false
        const externalId = (msgKey?.id as string) || null
        const ts = msg.messageTimestamp as number | undefined
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
      message: `✅ ${syncedChats} conversas recentes e ${syncedMessages} mensagens sincronizadas!`,
    })
  } catch (err) {
    console.error('[/api/whatsapp/sync-deep] Erro:', err)
    return NextResponse.json({ error: 'Falha na sincronização profunda' }, { status: 500 })
  }
}
