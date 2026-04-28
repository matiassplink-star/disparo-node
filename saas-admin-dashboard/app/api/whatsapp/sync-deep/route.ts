import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getChats, getMessages } from '@/lib/evolution-api'

/**
 * POST /api/whatsapp/sync-deep
 * Sincronização Profunda: busca histórico completo direto na Evolution API.
 * Usa external_id para evitar duplicatas em cada execução.
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

    // 1. Busca todos os chats disponíveis na instância
    const chats = await getChats(instance.instance_name)

    if (!Array.isArray(chats) || chats.length === 0) {
      return NextResponse.json({
        synced: 0,
        messages: 0,
        message: 'Nenhum chat encontrado na Evolution API. Verifique se o WhatsApp está conectado.',
      })
    }

    let syncedChats = 0
    let syncedMessages = 0
    // Limitar a 50 para não causar timeout no Vercel (max 10s Hobby / 60s Pro)
    const topChats = chats.slice(0, 50)

    for (const chat of topChats) {
      const rawJid: string = (chat.id as string) || (chat.remoteJid as string) || ''
      if (!rawJid || rawJid.endsWith('@g.us') || rawJid.endsWith('@broadcast')) continue

      const phone = rawJid.replace('@s.whatsapp.net', '').replace('@c.us', '')
      const name: string = (chat.name as string) || (chat.pushName as string) || phone

      // Cria/Atualiza contato sem conflict
      await supabase
        .from('contacts')
        .upsert(
          { user_id: user.id, instance_id: instance.id, phone, name, chat_status: 'open' },
          { onConflict: 'user_id,phone', ignoreDuplicates: false }
        )

      syncedChats++

      // 2. Busca até 100 mensagens do chat
      const msgs = await getMessages(instance.instance_name, rawJid, 100)
      if (!Array.isArray(msgs)) continue

      for (const msg of msgs) {
        // Extrair texto com os principais tipos de mensagem
        const msgContent = msg.message as Record<string, unknown> | undefined
        const extText = (msgContent?.extendedTextMessage as Record<string, unknown>)?.text as string | undefined
        const imageCaption = (msgContent?.imageMessage as Record<string, unknown>)?.caption as string | undefined
        const videoCaption = (msgContent?.videoMessage as Record<string, unknown>)?.caption as string | undefined

        const messageText =
          (msgContent?.conversation as string) ||
          extText ||
          imageCaption ||
          videoCaption ||
          (msg.body as string) ||
          ''

        if (!messageText && !msg.hasMedia) continue

        const key = msg.key as Record<string, unknown> | undefined
        const fromMe: boolean = (key?.fromMe as boolean) ?? (msg.fromMe as boolean) ?? false
        const externalId: string | null = (key?.id as string) || null
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
      message: `✅ Sincronização completa: ${syncedChats} contatos e ${syncedMessages} mensagens históricas salvas!`,
    })
  } catch (err) {
    console.error('[/api/whatsapp/sync-deep] Erro:', err)
    return NextResponse.json({ error: 'Falha na sincronização profunda' }, { status: 500 })
  }
}
