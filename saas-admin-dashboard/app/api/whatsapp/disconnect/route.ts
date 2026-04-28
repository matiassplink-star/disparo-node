import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { logoutInstance } from '@/lib/evolution-api'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!instance) {
      return NextResponse.json({ error: 'Nenhuma instância encontrada' }, { status: 404 })
    }

    // Desconectar na Evolution API
    await logoutInstance(instance.instance_name)

    // Atualizar status no banco
    await supabase
      .from('whatsapp_instances')
      .update({ status: 'disconnected', phone_number: null })
      .eq('id', instance.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/whatsapp/disconnect] Erro:', err)
    return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 })
  }
}
