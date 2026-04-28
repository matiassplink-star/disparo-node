import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getInstanceStatus } from '@/lib/evolution-api'

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ status: 'disconnected', phone: null })
    }

    // Consultar status em tempo real na Evolution API
    const statusData = await getInstanceStatus(instance.instance_name)
    const evolutionState = statusData?.instance?.state || 'close'

    // Mapear estado da Evolution API para o nosso padrão
    const statusMap: Record<string, string> = {
      open: 'connected',
      connecting: 'connecting',
      close: 'disconnected',
    }
    const mappedStatus = statusMap[evolutionState] || 'disconnected'

    // Atualizar banco se o status mudou
    if (mappedStatus !== instance.status) {
      await supabase
        .from('whatsapp_instances')
        .update({ status: mappedStatus })
        .eq('id', instance.id)
    }

    return NextResponse.json({
      status: mappedStatus,
      phone: instance.phone_number,
      instanceName: instance.instance_name,
    })
  } catch (err) {
    console.error('[/api/whatsapp/status] Erro:', err)
    return NextResponse.json({ status: 'disconnected', phone: null })
  }
}
