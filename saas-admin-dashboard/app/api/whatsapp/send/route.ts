import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendTextMessage } from '@/lib/evolution-api'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    // Validar corpo
    const { remoteJid, text } = await request.json()
    if (!remoteJid || !text) {
      return NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 })
    }

    // Pegar a instância ativa do usuário
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name, status')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .maybeSingle()

    if (!instance) {
      return NextResponse.json({ error: 'WhatsApp não está conectado.' }, { status: 400 })
    }

    // 1. Enviar mensagem na Evolution API
    const evoRes = await sendTextMessage(instance.instance_name, remoteJid, text)

    // 2. Salvar a mensagem no Supabase para aparecer na tela imediatamente 
    // (Útil para o teste local onde o webhook não funciona)
    await supabase.from('messages').insert({
      user_id: user.id,
      instance_id: instance.id,
      remote_jid: remoteJid,
      content: text,
      from_me: true,
      message_type: 'text',
      status: 'sent'
    })

    return NextResponse.json({ success: true, response: evoRes })

  } catch (err: any) {
    console.error('[/api/whatsapp/send] Erro:', err)
    return NextResponse.json({ error: err.message || 'Falha ao enviar mensagem' }, { status: 500 })
  }
}
