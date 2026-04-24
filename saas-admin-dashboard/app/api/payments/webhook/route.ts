import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MercadoPagoConfig, Payment } from 'mercadopago'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const mpAccessToken = process.env.MP_ACCESS_TOKEN || ''
    const client = new MercadoPagoConfig({ accessToken: mpAccessToken })

    const url = new URL(req.url)
    const topic = url.searchParams.get('topic') || url.searchParams.get('type')
    const id = url.searchParams.get('data.id') || url.searchParams.get('id')

    if (topic === 'payment' && id) {
      const paymentClient = new Payment(client)
      const paymentData = await paymentClient.get({ id: id })

      if (paymentData && paymentData.external_reference) {
        const pagamentoId = paymentData.external_reference
        const status = paymentData.status // 'approved', 'pending', 'rejected', etc.

        // Atualizar status na tabela pagamentos
        await supabase
          .from('pagamentos')
          .update({
            status,
            gateway_id: id,
          })
          .eq('id', pagamentoId)

        // Se aprovado, atualizar acesso do usuário
        if (status === 'approved') {
          // Buscar o pagamento para saber qual plano e usuário
          const { data: pag } = await supabase
            .from('pagamentos')
            .select('user_id, plano')
            .eq('id', pagamentoId)
            .single()

          if (pag) {
            let diasToAdd = 30
            if (pag.plano === 'semestral') diasToAdd = 180
            else if (pag.plano === 'anual') diasToAdd = 365

            // Obter acesso_ate atual
            const { data: user } = await supabase
              .from('users')
              .select('acesso_ate')
              .eq('id', pag.user_id)
              .single()
            
            let novoAcesso = new Date()
            if (user?.acesso_ate && new Date(user.acesso_ate) > new Date()) {
              novoAcesso = new Date(user.acesso_ate)
            }
            novoAcesso.setDate(novoAcesso.getDate() + diasToAdd)

            await supabase
              .from('users')
              .update({ acesso_ate: novoAcesso.toISOString() })
              .eq('id', pag.user_id)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook erro:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
