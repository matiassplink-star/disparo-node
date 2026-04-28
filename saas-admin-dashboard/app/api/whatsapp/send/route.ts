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

    const { remoteJid: rawJid, text } = await request.json()
    if (!rawJid || !text) {
      return NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 })
    }

    // Normalizar o remoteJid — sempre usar sem sufixos
    const remoteJid = rawJid
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '')
      .replace('@lid', '')

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name, status')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .maybeSingle()

    if (!instance) {
      return NextResponse.json({ error: 'WhatsApp não está conectado.' }, { status: 400 })
    }

    // Tenta enviar com número normal primeiro
    let evoRes = await sendTextMessage(instance.instance_name, remoteJid, text)

    // Se falhou (exists: false) = contato @lid (Meta Privacy) — retry com @lid
    const evoAny = evoRes as Record<string, unknown>
    const isNotFound =
      evoAny?.status === 400 ||
      JSON.stringify(evoAny).includes('"exists":false') ||
      JSON.stringify(evoAny).includes('not found')

    if (isNotFound) {
      evoRes = await sendTextMessage(instance.instance_name, `${remoteJid}@lid`, text)
    }

    // Se ainda falhou, retorna erro real (não genérico)
    const evoFinal = evoRes as Record<string, unknown>
    if (!evoFinal?.key) {
      const resp = evoFinal?.response as Record<string, unknown> | undefined
      const errorMsg =
        (Array.isArray(resp?.message) ? resp?.message[0] : resp?.message) ||
        evoFinal?.message ||
        'Número não encontrado no WhatsApp'
      console.error('[send] Evolution API erro:', JSON.stringify(evoFinal))
      return NextResponse.json({ error: String(errorMsg) }, { status: 400 })
    }

    const keyData = evoFinal.key as Record<string, unknown>
    const externalId: string | null = (keyData?.id as string) || null

    await supabase.from('messages').upsert(
      {
        user_id: user.id,
        instance_id: instance.id,
        remote_jid: remoteJid,
        external_id: externalId,
        content: text,
        from_me: true,
        message_type: 'text',
        status: 'sent',
      },
      {
        onConflict: externalId ? 'user_id,external_id' : 'id',
        ignoreDuplicates: true,
      }
    )

    return NextResponse.json({ success: true, externalId })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao enviar mensagem'
    console.error('[/api/whatsapp/send] Erro:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
