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
      const msg = data
      if (!msg?.key?.remoteJid) return NextResponse.json({ received: true })

      // Ignorar mensagens de grupos por enquanto
      if (msg.key.remoteJid.endsWith('@g.us')) {
        return NextResponse.json({ received: true })
      }

      const message = data
      if (!message?.key?.remoteJid) return NextResponse.json({ received: true })

      const messageText =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        ''

      // 3. Verifica/Cria Contato
      let phoneNum = message.key.remoteJid.replace('@s.whatsapp.net', '')
      if (phoneNum.includes('@g.us')) {
        // É um grupo, não vamos salvar como contato normal no CRM para não poluir
        // Ou podemos salvar com um tipo diferente, mas por hora ignoramos no CRM
      } else {
        // Busca se contato já existe
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
            name: message.pushName || phoneNum,
            chat_status: 'open'
          })
        } else if (existingContact.chat_status === 'closed') {
          // Se o chat estava fechado e o cliente mandou nova mensagem, reabre
          if (!message.key.fromMe) {
            await supabase.from('contacts').update({ chat_status: 'open' }).eq('id', existingContact.id)
          }
        }
      }

      // 4. Salva a mensagem
      await supabase
        .from('messages')
        .insert({
          user_id: instance.user_id,
          instance_id: instance.id,
          remote_jid: phoneNum,
          content: messageText,
          message_type: 'text', // Simplificado, ideal seria extrair o tipo real (image, audio)
          from_me: message.key.fromMe || false,
          status: 'sent',
        })
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
