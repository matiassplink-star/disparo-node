import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// Recebe TODOS os webhooks da Evolution API
// Configurar a URL deste endpoint na Evolution API:
// https://seu-dominio.vercel.app/api/webhook/evolution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instance: instanceName, event, data } = body

    // Ignorar eventos sem nome de instância
    if (!instanceName || !event) {
      return NextResponse.json({ received: true })
    }

    const supabase = getSupabase()

    // Buscar a instância no banco para descobrir o user_id
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('id, user_id, status')
      .eq('instance_name', instanceName)
      .maybeSingle()

    if (!instance) {
      // Instância desconhecida — ignorar silenciosamente
      return NextResponse.json({ received: true })
    }

    // ─── Evento: Atualização de conexão ──────────────────────
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
          // Salvar número quando conectar
          ...(state === 'open' && data?.instance?.owner
            ? { phone_number: data.instance.owner.replace('@s.whatsapp.net', '') }
            : {}),
        })
        .eq('id', instance.id)
    }

    // ─── Evento: Nova mensagem recebida ──────────────────────
    if (event === 'messages.upsert') {
      // Evolution API pode enviar um array em data.messages, ou data.message, ou o objeto direto
      let messagesArray: any[] = []
      if (Array.isArray(data)) messagesArray = data
      else if (data?.messages && Array.isArray(data.messages)) messagesArray = data.messages
      else if (data?.message) messagesArray = [data.message]
      else messagesArray = [data]

      for (const msg of messagesArray) {
        if (!msg?.key?.remoteJid) continue

        // Ignorar mensagens de status e grupos
        if (msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid.endsWith('@g.us')) {
          continue
        }

        const messageText =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          '[Mídia]' // Fallback para áudios/imagens sem legenda

        let phoneNum = msg.key.remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '')
        const pushName = msg.pushName || phoneNum

        // 3. Verifica/Cria Contato
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id, chat_status')
          .eq('user_id', instance.user_id)
          .eq('phone', phoneNum)
          .maybeSingle()

        if (!existingContact) {
          // Cria o contato automaticamente
          await supabase.from('contacts').insert({
            user_id: instance.user_id,
            instance_id: instance.id,
            phone: phoneNum,
            name: pushName,
            chat_status: 'open'
          })
        } else if (existingContact.chat_status === 'closed') {
          // Se o chat estava fechado e o cliente mandou nova mensagem, reabre
          if (!msg.key.fromMe) {
            await supabase.from('contacts').update({ chat_status: 'open' }).eq('id', existingContact.id)
          }
        }

        // 4. Salva a mensagem (ignorando se já existir)
        await supabase
          .from('messages')
          .upsert({
            user_id: instance.user_id,
            instance_id: instance.id,
            remote_jid: phoneNum,
            content: messageText,
            message_type: 'text',
            from_me: msg.key.fromMe || false,
            status: 'sent',
          }, { ignoreDuplicates: false }) // Idealmente teríamos external_id como Unique Constraint
      }
    }

    // ─── Evento: QR Code atualizado ──────────────────────────
    // (apenas log — o QR é buscado diretamente pelo frontend via /api/whatsapp/connect)
    if (event === 'qrcode.updated') {
      await supabase
        .from('whatsapp_instances')
        .update({ status: 'connecting' })
        .eq('id', instance.id)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[/api/webhook/evolution] Erro:', err)
    // Sempre retornar 200 para a Evolution API não retentar
    return NextResponse.json({ received: true })
  }
}
