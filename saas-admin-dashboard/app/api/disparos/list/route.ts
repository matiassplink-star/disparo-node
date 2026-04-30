import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: Request) {
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
    // Buscar campanhas do usuário (limitando às ultimas 20)
    const { data: campaigns, error: campError } = await supabase
      .from('campaigns')
      .select(`
        id, name, status, message_template, created_at,
        campaign_leads (id, status)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (campError) {
      throw new Error(campError.message)
    }

    // Processar métricas no backend
    const campaignsWithMetrics = campaigns.map((camp: any) => {
      const leads = camp.campaign_leads || []
      const metrics = {
        pending: leads.filter((l: any) => l.status === 'pending').length,
        sent: leads.filter((l: any) => l.status === 'sent').length,
        failed: leads.filter((l: any) => l.status === 'failed').length,
        total: leads.length
      }

      // Remover o array pesado de leads do payload de retorno
      delete camp.campaign_leads

      return {
        ...camp,
        metrics
      }
    })

    return NextResponse.json({ campaigns: campaignsWithMetrics })

  } catch (error: any) {
    console.error('Erro listar campanhas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
