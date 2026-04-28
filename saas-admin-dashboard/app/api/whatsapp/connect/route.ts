import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { createInstance, getQRCode, setInstanceWebhook } from '@/lib/evolution-api'

// URL base do app para o webhook — usa variável de ambiente ou fallback para URL do Vercel
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://disparo-node-mwrtptvgn-matiassplink-stars-projects.vercel.app'
const WEBHOOK_URL = `${APP_URL}/api/webhook/evolution`

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()

    const token = request.cookies.get('sb-access-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
    }

    // Verificar se já tem uma instância para esse usuário
    const { data: existing } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const instanceName = existing?.instance_name || `splink-${user.id.slice(0, 8)}`

    // Se não existe: criar instância + configurar webhook automaticamente
    if (!existing) {
      await createInstance(instanceName)

      // ✅ Webhook automático — cliente não precisa configurar nada
      await setInstanceWebhook(instanceName, WEBHOOK_URL)

      await supabase.from('whatsapp_instances').insert({
        user_id: user.id,
        instance_name: instanceName,
        status: 'connecting',
      })
    }

    // Buscar QR Code
    let qrData;
    try {
      qrData = await getQRCode(instanceName)
    } catch (error) {
      console.warn(`[Evolution] Instância ${instanceName} falhou ao buscar QR Code. Tentando recriar...`)
      // Se falhar (ex: deletado na Evolution API mas não no banco), tenta recriar
      await createInstance(instanceName)
      await setInstanceWebhook(instanceName, WEBHOOK_URL)
      qrData = await getQRCode(instanceName)
    }

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
