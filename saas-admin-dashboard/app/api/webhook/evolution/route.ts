import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// Recebe TODOS os webhooks da Evolution API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instance: instanceName, event, data } = body

    if (!instanceName || !event) {
      return NextResponse.json({ received: true })
    }

    const supabase = getSupabase()

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('id, user_id, status')
      .eq('instance_name', instanceName)
      .maybeSingle()

    if (!instance) {
      return NextResponse.json({ received: true })
    }

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
    // messages.set = histórico em massa na primeira sincronização
    // messages.upsert = nova mensagem em tempo real
    if (event === 'messages.upsert' || event === 'messages.set') {
      let messagesArray: Record<string, unknown>[] = []
      if (Array.isArray(data)) {
        messagesArray = data
      } else if (data?.messages && Array.isArray(data.messages)) {
        messagesArray = data.messages
      } else if (data && typeof data === 'object') {
        // Para mensagens avulsas ('ao vivo'), o payload vem como objeto root: { key: {...}, message: {...} }
        messagesArray = [data as Record<string, unknown>]
      }

      for (const msg of messagesArray) {
        const key = msg.key as Record<string, unknown> | undefined
        if (!key?.remoteJid) continue

        const remoteJid = key.remoteJid as string

        // Ignorar status e grupos
        if (remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) continue

        // Extrair texto da mensagem
        const msgContent = msg.message as Record<string, unknown> | undefined
        const extText = msgContent?.extendedTextMessage as Record<string, unknown> | undefined
        const imageMsg = msgContent?.imageMessage as Record<string, unknown> | undefined
        const videoMsg = msgContent?.videoMessage as Record<string, unknown> | undefined

        const messageText =
          (msgContent?.conversation as string) ||
          (extText?.text as string) ||
          (imageMsg?.caption as string) ||
          (videoMsg?.caption as string) ||
          '[Mídia]'

        const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')
        const rawPushName = (msg.pushName as string) || phone
        const pushName = rawPushName.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')
        const fromMe = (key.fromMe as boolean) || false
        // ID único da mensagem na Evolution/WhatsApp — previne duplicatas
        const externalId = (key.id as string) || null

        // Timestamp real da mensagem (em segundos Unix)
        const ts = msg.messageTimestamp as number | undefined
        const createdAt = ts ? new Date(ts * 1000).toISOString() : new Date().toISOString()

        // Upsert contato
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

        // Upsert mensagem usando external_id para evitar duplicatas
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
              status: 'sent',
              created_at: createdAt,
            },
            {
              onConflict: externalId ? 'user_id,external_id' : 'id',
              ignoreDuplicates: true,
            }
          )
      }
    }

    // ─── messages.update — atualiza status (entregue/lido) ───
    if (event === 'messages.update') {
      const updates = Array.isArray(data) ? data : [data]
      for (const upd of updates) {
        const key = upd?.key as Record<string, unknown> | undefined
        if (!key?.id) continue

        const statusRaw = (upd?.update as Record<string, unknown>)?.status as number | string | undefined
        // Evolution API usa números: 3 = delivered, 4 = read
        const statusMap: Record<string | number, string> = {
          1: 'sent',
          2: 'sent',
          3: 'delivered',
          4: 'read',
          5: 'read',
          DELIVERY_ACK: 'delivered',
          READ: 'read',
          PLAYED: 'read',
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
    // Sincroniza a agenda do WhatsApp como contatos no CRM
    if (event === 'contacts.set' || event === 'contacts.upsert') {
      const contactsArray = Array.isArray(data) ? data : (data?.contacts || [])
      for (const c of contactsArray) {
        const phone = ((c.id as string) || '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')
        if (!phone || phone.endsWith('@g.us')) continue

        const rawName = (c.pushName as string) || (c.notify as string) || phone
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

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[/api/webhook/evolution] Erro:', err)
    return NextResponse.json({ received: true })
  }
}
