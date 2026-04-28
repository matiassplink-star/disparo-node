import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Processamento assíncrono (Worker / Cron Job)
// Lê os webhooks brutos do banco e aplica a lógica pesada
export async function GET() {
  try {
    const supabase = getSupabase()

    // Pega até 50 logs não processados
    const { data: logs, error: fetchError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(50)

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
                open: 'connected',
                connecting: 'connecting',
                close: 'disconnected',
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
              if (Array.isArray(data)) {
                messagesArray = data
              } else if (data?.messages && Array.isArray(data.messages)) {
                messagesArray = data.messages
              } else if (data?.message && typeof data.message === 'object' && data.message.key) {
                // Evolution API v2 frequently sends the message wrapped in 'message' inside 'data'
                messagesArray = [data.message]
              } else if (data && typeof data === 'object') {
                messagesArray = [data]
              }

              for (const msg of messagesArray) {
                const key = msg.key
                if (!key?.remoteJid) continue

                const remoteJid = key.remoteJid as string
                if (remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) continue

                const msgContent = msg.message
                const extText = msgContent?.extendedTextMessage
                const imageMsg = msgContent?.imageMessage
                const videoMsg = msgContent?.videoMessage

                const messageText =
                  msgContent?.conversation ||
                  extText?.text ||
                  imageMsg?.caption ||
                  videoMsg?.caption ||
                  '[Mídia]'

                const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')
                const rawPushName = msg.pushName || phone
                const pushName = rawPushName.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')
                const fromMe = key.fromMe || false
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

                await supabase
                  .from('messages')
                  .upsert(
                    {
                      user_id: instance.user_id,
                      instance_id: instance.id,
                      remote_jid: phone,
                      external_id: externalId,
                      content: messageText,
                      message_type: 'text',
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

            // ─── contacts.set | contacts.upsert ──────────────────────
            if (event === 'contacts.set' || event === 'contacts.upsert') {
              const contactsArray = Array.isArray(data) ? data : (data?.contacts || [])
              for (const c of contactsArray) {
                const phone = (c.id || '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')
                if (!phone || phone.endsWith('@g.us')) continue

                const rawName = c.pushName || c.notify || phone
                const name = rawName.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')

                await supabase
                  .from('contacts')
                  .upsert(
                    { user_id: instance.user_id, instance_id: instance.id, phone, name },
                    { onConflict: 'user_id,phone', ignoreDuplicates: true }
                  )
              }
            }

            // ─── qrcode.updated ──────────────────────────────────────
            if (event === 'qrcode.updated') {
              await supabase
                .from('whatsapp_instances')
                .update({ status: 'connecting' })
                .eq('id', instance.id)
            }
          }
        }

        // Marca como processado
        await supabase
          .from('webhook_logs')
          .update({ processed: true })
          .eq('id', log.id)

      } catch (logError: any) {
        // Marca como erro
        await supabase
          .from('webhook_logs')
          .update({ processed: true, error: logError.message || 'Error processing log' })
          .eq('id', log.id)
      }
    }

    return NextResponse.json({ processed_count: logs.length })

  } catch (err) {
    console.error('[/api/cron/process-webhooks] Erro:', err)
    return NextResponse.json({ error: 'Falha no processamento' }, { status: 500 })
  }
}
