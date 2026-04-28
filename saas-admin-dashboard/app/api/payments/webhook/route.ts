import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import crypto from 'crypto'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Verifica assinatura HMAC do Mercado Pago (Fix #49) */
function verifyMpSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // Sem secret configurado, pula verificação (modo dev)

  const xSignature = req.headers.get('x-signature') || ''
  const xRequestId = req.headers.get('x-request-id') || ''
  const dataId = new URL(req.url).searchParams.get('data.id') || ''

  // Formato: ts=...,v1=...
  const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')))
  const ts = parts['ts'] || ''
  const v1 = parts['v1'] || ''
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return expected === v1
}

export async function POST(req: NextRequest) {
  let rawBody = ''
  try {
    rawBody = await req.text()
  } catch { /* ignora */ }

  // Fix #49: verificação de assinatura MP
  if (!verifyMpSignature(req, rawBody)) {
    console.warn('[WEBHOOK] Assinatura inválida — requisição rejeitada')
    return NextResponse.json({ success: true }) // Fix #60: sempre 200 para MP
  }

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
        const status = paymentData.status

        // Fix #50: checar erro antes de prosseguir
        const { error: updateError } = await supabase
          .from('pagamentos')
          .update({ status, gateway_id: id })
          .eq('id', pagamentoId)

        if (updateError) {
          console.error('[WEBHOOK] Erro ao atualizar pagamento:', updateError)
          return NextResponse.json({ success: true }) // Fix #60: sempre 200
        }

        // Se aprovado, atualizar acesso do usuário
        if (status === 'approved') {
          const { data: pag } = await supabase
            .from('pagamentos')
            .select('user_id, plano')
            .eq('id', pagamentoId)
            .single()

          if (pag) {
            let diasToAdd = 30
            if (pag.plano === 'semestral') diasToAdd = 180
            else if (pag.plano === 'anual') diasToAdd = 365

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
              .update({ acesso_ate: novoAcesso.toISOString(), plano: pag.plano })
              .eq('id', pag.user_id)

            console.log(`[PAYMENT APPROVED] User ${pag.user_id} → ${pag.plano} até ${novoAcesso.toISOString()}`)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook erro:', error)
    // Fix #60: sempre retorna 200 para evitar re-tentativas infinitas do MP
    return NextResponse.json({ success: true })
  }
}

