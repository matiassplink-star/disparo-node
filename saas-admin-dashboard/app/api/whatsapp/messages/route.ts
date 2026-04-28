import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/whatsapp/messages?remote_jid=553499929764&limit=60
 * Busca histórico de mensagens de uma conversa via service role (bypassa RLS do browser)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const remoteJid = searchParams.get('remote_jid')
    // Puxa somente as ultimas 5 msgs
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 50)

    if (!remoteJid) {
      return NextResponse.json({ error: 'remote_jid é obrigatório' }, { status: 400 })
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, external_id, remote_jid, content, from_me, status, message_type, created_at')
      .eq('user_id', user.id)
      .eq('remote_jid', remoteJid)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[/api/whatsapp/messages] Erro:', error.message)
      return NextResponse.json({ error: 'Falha ao carregar mensagens' }, { status: 500 })
    }

    // Retorna em ordem cronológica (mais antigas primeiro)
    return NextResponse.json((messages ?? []).reverse())

  } catch (err) {
    console.error('[/api/whatsapp/messages] Erro:', err)
    return NextResponse.json({ error: 'Falha ao carregar mensagens' }, { status: 500 })
  }
}
