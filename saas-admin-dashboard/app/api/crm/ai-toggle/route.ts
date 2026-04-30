import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const { remoteJid, active } = await request.json()
    if (!remoteJid) return NextResponse.json({ error: 'remoteJid é obrigatório' }, { status: 400 })

    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '')

    const { error } = await supabase
      .from('contacts')
      .update({ ai_active: active })
      .eq('user_id', user.id)
      .eq('phone', phone)

    if (error) throw error

    return NextResponse.json({ success: true, ai_active: active })
  } catch (err) {
    console.error('[/api/crm/ai-toggle] Erro:', err)
    return NextResponse.json({ error: 'Falha ao alterar status da IA' }, { status: 500 })
  }
}
