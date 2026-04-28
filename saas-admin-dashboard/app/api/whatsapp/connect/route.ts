import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { createInstance, getQRCode } from '@/lib/evolution-api'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()

    // Verificar autenticação pelo cookie
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
    }

    // Verificar se já tem uma instância criada para esse usuário
    const { data: existing } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const instanceName = existing?.instance_name || `user-${user.id.slice(0, 8)}`

    // Se não existe no banco, criar nova instância na Evolution API e salvar no banco
    if (!existing) {
      await createInstance(instanceName)

      await supabase.from('whatsapp_instances').insert({
        user_id: user.id,
        instance_name: instanceName,
        status: 'connecting',
      })
    }

    // Buscar QR Code da Evolution API
    const qrData = await getQRCode(instanceName)

    return NextResponse.json({
      instanceName,
      qrcode: qrData.base64 || null,
      status: existing?.status || 'connecting',
    })
  } catch (err) {
    console.error('[/api/whatsapp/connect] Erro:', err)
    return NextResponse.json(
      { error: 'Erro interno ao conectar WhatsApp' },
      { status: 500 }
    )
  }
}
