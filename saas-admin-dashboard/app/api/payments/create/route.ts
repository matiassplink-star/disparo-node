import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MercadoPagoConfig, Preference } from 'mercadopago'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configuração do Mercado Pago
// Usar a chave de teste por padrão até o usuário trocar
const mpAccessToken = process.env.MP_ACCESS_TOKEN || ''
const client = new MercadoPagoConfig({ accessToken: mpAccessToken })

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: { user: authUser } } = await supabase.auth.getUser(token)
    if (!authUser) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!userData) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const { plano } = await req.json() // 'mensal', 'semestral', 'anual'

    let valor = 0
    let title = ''

    if (plano === 'mensal') { valor = 49.90; title = 'Plano Mensal - ZapLink' }
    else if (plano === 'semestral') { valor = 247.90; title = 'Plano Semestral - ZapLink' }
    else if (plano === 'anual') { valor = 397.90; title = 'Plano Anual - ZapLink' }
    else return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

    if (!mpAccessToken) {
      return NextResponse.json({ error: 'Mercado Pago não configurado. Entre em contato com o administrador.' }, { status: 500 })
    }

    // Criar registro de pagamento pendente
    const { data: pagamento, error: insertError } = await supabase
      .from('pagamentos')
      .insert({
        user_id: userData.id,
        valor,
        plano,
        status: 'pendente',
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Criar Preferência no Mercado Pago
    const preference = new Preference(client)
    
    // O Webhook url precisa ser público. Em localhost, não funciona a notificação automática,
    // mas o brick ainda processa o pagamento.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const pref = await preference.create({
      body: {
        items: [
          {
            id: plano,
            title: title,
            quantity: 1,
            unit_price: valor,
            currency_id: 'BRL',
          }
        ],
        payer: {
          email: userData.email,
          name: userData.nome,
        },
        external_reference: pagamento.id, // Para identificar o pagamento no webhook
      }
    })

    return NextResponse.json({ preferenceId: pref.id, pagamentoId: pagamento.id })
  } catch (error: any) {
    console.error('Erro ao criar pagamento:', error)
    return NextResponse.json({ error: error.message || 'Erro ao criar pagamento' }, { status: 500 })
  }
}
