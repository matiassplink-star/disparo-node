import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendTextMessage } from '@/lib/evolution-api'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()

    // Supabase SSR gera cookies com nomes variados. Tentamos múltiplos padrões.
    const allCookies = request.cookies.getAll()
    const token =
      request.cookies.get('sb-access-token')?.value ||
      allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))?.value ||
      allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token.0'))?.value

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

    let evoRes: unknown
    let tryLidFallback = false

    try {
      // Tenta enviar com número normal primeiro
      evoRes = await sendTextMessage(instance.instance_name, remoteJid, text)
    } catch (try1Error: unknown) {
      const errStr = try1Error instanceof Error ? try1Error.message : String(try1Error)
      if (errStr.includes('"exists":false') || errStr.includes('not found') || errStr.includes('Bad Request')) {
        tryLidFallback = true
      } else {
        throw try1Error
      }
    }

    if (tryLidFallback) {
      try {
        evoRes = await sendTextMessage(instance.instance_name, `${remoteJid}@lid`, text)
      } catch (try2Error: unknown) {
        // Se a tentativa com @lid tbm falhar, joga o erro pro catch global mostrar
        throw try2Error
      }
    }

    // Se ainda falhou sem dar throw (improvável com a nossa helper, mas checa a key por segurança)
    const evoFinal = evoRes as Record<string, unknown>
    if (!evoFinal?.key) {
      console.error('[send] Evolution API erro sem key:', JSON.stringify(evoFinal))
      return NextResponse.json({ error: 'Número não encontrado ou sem permissão de envio' }, { status: 400 })
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
