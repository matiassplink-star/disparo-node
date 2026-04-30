import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }) } catch (error) {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }) } catch (error) {}
        },
      },
    }
  )

  const authCookie = cookieStore.get('sb-access-token') || cookieStore.get('sb-tklnrqmbfxevwgnmdrnj-auth-token')
  let userId = null

  if (authCookie?.value) {
    const { data: { user } } = await supabase.auth.getUser(authCookie.value)
    if (user) userId = user.id
  } else {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) userId = session.user.id
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { instance_id, name, message_template, delay_min, delay_max, numbers } = body

    if (!instance_id || !name || !message_template || !numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: 'Faltam campos obrigatórios ou lista de números vazia.' }, { status: 400 })
    }

    // 1. Criar a campanha
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        user_id: userId,
        instance_id,
        name,
        message_template,
        delay_min: parseInt(delay_min) || 15,
        delay_max: parseInt(delay_max) || 30,
        status: 'running'
      })
      .select('id')
      .single()

    if (campaignError || !campaign) {
      throw new Error(campaignError?.message || 'Erro ao criar campanha')
    }

    // 2. Inserir os leads (limpar formato primeiro)
    const leadsToInsert = numbers.map(phone => {
      // Remover tudo que não for dígito
      const cleanPhone = phone.replace(/\D/g, '')
      return {
        campaign_id: campaign.id,
        phone: cleanPhone,
        status: 'pending'
      }
    }).filter(lead => lead.phone.length >= 10) // Evitar lixo

    const { error: leadsError } = await supabase
      .from('campaign_leads')
      .insert(leadsToInsert)

    if (leadsError) {
      // Se falhar, atualizar campanha para erro
      await supabase.from('campaigns').update({ status: 'error' }).eq('id', campaign.id)
      throw new Error(leadsError.message)
    }

    return NextResponse.json({ success: true, campaign_id: campaign.id, total_leads: leadsToInsert.length })
  } catch (err: any) {
    console.error('Erro na criação de campanha:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
