import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getChats, getMessages } from '@/lib/evolution-api'

/**
 * POST /api/whatsapp/sync-deep
 * Sincronização Profunda: Busca todas as conversas da Evolution API 
 * e itera sobre elas buscando o histórico de mensagens de forma agressiva.
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

    // 1. Busca todos os chats disponíveis
    const chats = await getChats(instance.instance_name)

    if (!Array.isArray(chats) || chats.length === 0) {
      return NextResponse.json({ synced: 0, message: 'Nenhum chat retornado pela Evolution API' })
    }

    let syncedChats = 0
    let syncedMessages = 0

    // Vamos processar no máximo os 50 chats mais recentes para não dar timeout na requisição Serverless
    // Idealmente isso seria um Background Job (BullMQ / Inngest)
    const topChats = chats.slice(0, 50)

    for (const chat of topChats) {
      const remoteJid: string = chat.id || chat.remoteJid || ''
      if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast')) continue

      const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '')
      const name: string = chat.name || chat.pushName || phone

      // Cria/Atualiza contato
      await supabase
        .from('contacts')
        .upsert(
          {
            user_id: user.id,
            instance_id: instance.id,
            phone,
            name,
            chat_status: 'open',
          },
          { onConflict: 'user_id,phone', ignoreDuplicates: false }
        )

      syncedChats++

      // 2. Sincronização Profunda de Mensagens: Puxar até 100 mensagens por chat
      const msgs = await getMessages(instance.instance_name, remoteJid, 100)

      if (Array.isArray(msgs)) {
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
          
          await supabase.from('messages').upsert(
            {
              user_id: user.id,
              instance_id: instance.id,
              remote_jid: phone,
              content: messageText || '[Mídia]',
              from_me: fromMe,
              message_type: 'text',
              status: 'sent',
              // Use o timestamp real da mensagem se disponível
              ...(msg.messageTimestamp ? { created_at: new Date(msg.messageTimestamp * 1000).toISOString() } : {})
            },
            { ignoreDuplicates: false }
          )
          syncedMessages++
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedChats,
      messages: syncedMessages,
      message: `Sincronização Profunda: ${syncedChats} contatos e ${syncedMessages} mensagens históricas salvas!`,
    })

  } catch (err) {
    console.error('[/api/whatsapp/sync-deep] Erro:', err)
    return NextResponse.json({ error: 'Falha na sincronização profunda' }, { status: 500 })
  }
}
