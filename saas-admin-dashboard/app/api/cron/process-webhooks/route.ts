import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Processamento assíncrono Industrial
export async function GET() {
  try {
    const supabase = getSupabase()

    // 1. Limpeza automática de logs antigos (Fire-and-forget seguro no banco)
    supabase.rpc('cleanup_old_webhook_logs').catch(() => {})

    // 2. Busca a fila usando SKIP LOCKED (evita concorrência e duplicação)
    const { data: logs, error: fetchError } = await supabase
      .rpc('get_unprocessed_webhooks', { batch_size: 50 })

    if (fetchError || !logs || logs.length === 0) {
      return NextResponse.json({ processed_count: 0 })
    }

    for (const log of logs) {
      try {
        const payload = log.payload as Record<string, any>
        const { instance: instanceName, event, data } = payload

        if (instanceName && event) {
          const { data: instance } = await supabase
            .from('whatsapp_instances')
            .select('id, user_id, status')
            .eq('instance_name', instanceName)
            .maybeSingle()

          if (instance) {
            // ─── connection.update ────────────────────────────────────
            if (event === 'connection.update') {
              const state = data?.state
              const statusMap: Record<string, string> = {
                open: 'connected', connecting: 'connecting', close: 'disconnected',
              }
              const newStatus = statusMap[state] || 'disconnected'

              await supabase
                .from('whatsapp_instances')
                .update({
                  status: newStatus,
                  ...(state === 'open' && data?.instance?.owner
                    ? { phone_number: data.instance.owner.replace('@s.whatsapp.net', '') }
                    : {}),
                })
                .eq('id', instance.id)
            }

            // ─── messages.upsert | messages.set ──────────────────────
            if (event === 'messages.upsert' || event === 'messages.set') {
              let messagesArray: Record<string, any>[] = []
              if (Array.isArray(data)) messagesArray = data
              else if (data?.messages && Array.isArray(data.messages)) messagesArray = data.messages
              else if (data?.message && typeof data.message === 'object' && data.message.key) messagesArray = [data.message]
              else if (data && typeof data === 'object') messagesArray = [data]

              for (const msg of messagesArray) {
                const key = msg.key
                if (!key?.remoteJid) continue

                const remoteJid = key.remoteJid as string
                if (remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) continue

                const fromMe = key.fromMe || false
                // Se o próprio sistema ou usuário mandou via Web/Celular, a Evolution envia. 
                // Se configurarmos para não processar fromMe, ignoramos. Mas como é um CRM, precisamos do histórico completo.

                // Parser completo Industrial
                const msgContent = msg.message || {}
                const extText = msgContent?.extendedTextMessage
                const imageMsg = msgContent?.imageMessage
                const videoMsg = msgContent?.videoMessage
                const audioMsg = msgContent?.audioMessage
                const docMsg = msgContent?.documentMessage
                const reactionMsg = msgContent?.reactionMessage

                let messageText = '[Formato Desconhecido]'
                let messageType = 'text'

                if (msgContent?.conversation) messageText = msgContent.conversation
                else if (extText?.text) messageText = extText.text
                else if (imageMsg) { messageText = imageMsg.caption || '[Imagem]'; messageType = 'image'; }
                else if (videoMsg) { messageText = videoMsg.caption || '[Vídeo]'; messageType = 'video'; }
                else if (audioMsg) { messageText = '[Áudio]'; messageType = 'audio'; }
                else if (docMsg) { messageText = docMsg.title || docMsg.fileName || '[Documento]'; messageType = 'document'; }
                else if (reactionMsg) { messageText = `[Reação: ${reactionMsg.text}]`; messageType = 'reaction'; }

                const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')
                const rawPushName = msg.pushName || phone
                const pushName = rawPushName.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')
                const externalId = key.id || null

                const ts = msg.messageTimestamp
                const createdAt = ts ? new Date(ts * 1000).toISOString() : new Date().toISOString()

                const { data: existingContact } = await supabase
                  .from('contacts')
                  .select('id, chat_status')
                  .eq('user_id', instance.user_id)
                  .eq('phone', phone)
                  .maybeSingle()

                if (!existingContact) {
                  await supabase.from('contacts').insert({
                    user_id: instance.user_id,
                    instance_id: instance.id,
                    phone,
                    name: pushName,
                    chat_status: 'open',
                  })
                } else if (existingContact.chat_status === 'closed' && !fromMe) {
                  await supabase.from('contacts').update({ chat_status: 'open' }).eq('id', existingContact.id)
                }

                // Deduplicação garantida pela constraint do banco (user_id, external_id)
                await supabase
                  .from('messages')
                  .upsert(
                    {
                      user_id: instance.user_id,
                      instance_id: instance.id,
                      remote_jid: phone,
                      external_id: externalId,
                      content: messageText,
                      message_type: messageType,
                      from_me: fromMe,
                      status: fromMe ? 'sent' : 'received',
                      created_at: createdAt,
                    },
                    {
                      onConflict: externalId ? 'user_id,external_id' : 'id',
                      ignoreDuplicates: true,
                    }
                  )
              }
            }

            // ─── messages.update ─────────────────────────────────────
            if (event === 'messages.update') {
              const updates = Array.isArray(data) ? data : [data]
              for (const upd of updates) {
                const key = upd?.key
                if (!key?.id) continue

                const statusRaw = upd?.update?.status
                const statusMap: Record<string | number, string> = {
                  1: 'sent', 2: 'sent', 3: 'delivered', 4: 'read', 5: 'read',
                  DELIVERY_ACK: 'delivered', READ: 'read', PLAYED: 'read',
                }
                const newStatus = statusRaw !== undefined ? (statusMap[statusRaw] || 'sent') : null

                if (newStatus) {
                  await supabase
                    .from('messages')
                    .update({ status: newStatus })
                    .eq('user_id', instance.user_id)
                    .eq('external_id', key.id as string)
                }
              }
            }
          }
        }

        // Sucesso: Marca como processado
        await supabase
          .from('webhook_logs')
          .update({ processed: true, processing: false, error: null })
          .eq('id', log.id)

      } catch (logError: any) {
        // Falha: Incrementa retry_count
        const nextRetry = (log.retry_count || 0) + 1;
        const willRetry = nextRetry < 3;
        
        await supabase
          .from('webhook_logs')
          .update({ 
            processing: false, 
            retry_count: nextRetry,
            processed: false, // só marca como true quando da sucesso
            failed: !willRetry, // se passou de 3, manda pra dead letter
            error: logError.message || 'Erro desconhecido' 
          })
          .eq('id', log.id)
      }
    }

    return NextResponse.json({ processed_count: logs.length })

  } catch (err) {
    console.error('[/api/cron/process-webhooks] Erro Geral:', err)
    return NextResponse.json({ error: 'Falha no processamento' }, { status: 500 })
  }
}
