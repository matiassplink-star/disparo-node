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

    // Supabase SSR pode usar nomes variados de cookie dependendo da versão do SDK.
    // Tentamos: nome legado, nome com project_ref e o padrão novo com sufixo .0
    const allCookies = request.cookies.getAll()
    const token =
      request.cookies.get('sb-access-token')?.value ||
      allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))?.value ||
      allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token.0'))?.value

    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const remoteJid = searchParams.get('remote_jid')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    if (!remoteJid) {
      return NextResponse.json({ error: 'remote_jid é obrigatório' }, { status: 400 })
    }

    // Normaliza o JID — busca com e sem @s.whatsapp.net para compatibilidade
    const normalizedJid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`
    const cleanJid = remoteJid.replace(/@.*$/, '')

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, external_id, remote_jid, content, from_me, status, message_type, created_at')
      .eq('user_id', user.id)
      .or(`remote_jid.eq.${cleanJid},remote_jid.eq.${normalizedJid},remote_jid.eq.${cleanJid}@c.us`)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[/api/whatsapp/messages] Erro:', error.message)
      return NextResponse.json({ error: 'Falha ao carregar mensagens' }, { status: 500 })
    }

    // Já em ordem cronológica (ASC) — sem precisar de .reverse()
    return NextResponse.json(messages ?? [])


  } catch (err) {
    console.error('[/api/whatsapp/messages] Erro:', err)
    return NextResponse.json({ error: 'Falha ao carregar mensagens' }, { status: 500 })
  }
}
