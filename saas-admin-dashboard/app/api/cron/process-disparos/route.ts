import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Isso garante que a rota não faça cache e sempre execute a lógica
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Limite da Vercel Pro (ajuste se estiver no Hobby = 10s)

export async function GET(request: Request) {
  // Autenticação de Cron (Segurança básica para não expor a rota)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Usamos Service Role Key para ignorar RLS no Cron Worker
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() { return undefined },
        set() {},
        remove() {},
      },
    }
  )

  try {
    // 1. Buscar Campanhas Rodando ('running') com suas instâncias
    const { data: campaigns, error: campError } = await supabase
      .from('campaigns')
      .select('id, message_template, media_url, delay_min, delay_max, instance_id, whatsapp_instances(instance_name, status)')
      .eq('status', 'running')

    if (campError) throw new Error(`Erro ao buscar campanhas: ${campError.message}`)
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ message: 'Nenhuma campanha em andamento.' })
    }

    const processedLogs = []

    // 2. Iterar sobre cada campanha ativa
    for (const campaign of campaigns) {
      const instance = campaign.whatsapp_instances as any
      // Se a instância caiu/desconectou, pula e não tenta enviar
      if (instance?.status !== 'connected') {
        processedLogs.push({ campaign_id: campaign.id, status: 'skipped_disconnected_instance' })
        continue
      }

      // Verificar o último disparo dessa campanha para respeitar o delay
      const { data: lastSend } = await supabase
        .from('campaign_leads')
        .select('sent_at')
        .eq('campaign_id', campaign.id)
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single()

      if (lastSend?.sent_at) {
        const lastTime = new Date(lastSend.sent_at).getTime()
        const now = Date.now()
        const diffSecs = (now - lastTime) / 1000

        // Se ainda não passou o tempo mínimo de delay, pula esta campanha nesta execução
        if (diffSecs < campaign.delay_min) {
          processedLogs.push({ campaign_id: campaign.id, status: 'skipped_delay_not_met', remaining_secs: campaign.delay_min - diffSecs })
          continue
        }
      }

      // 3. Pegar APENAS UM lead pendente dessa campanha (limit 1)
      const { data: leads, error: leadError } = await supabase
        .from('campaign_leads')
        .select('id, phone, name')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .order('id', { ascending: true }) // order pela inserção
        .limit(1)

      if (leadError) {
        console.error(`Erro ao buscar lead da campanha ${campaign.id}:`, leadError)
        continue
      }

      // Se não tem mais leads pendentes, marcamos a campanha como completed
      if (!leads || leads.length === 0) {
        await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaign.id)
        processedLogs.push({ campaign_id: campaign.id, status: 'campaign_completed' })
        continue
      }

      const lead = leads[0]

      // Marca como 'processing' pra evitar duplo envio se houver concorrência
      await supabase.from('campaign_leads').update({ status: 'processing' }).eq('id', lead.id)

      // 4. PREPARAR A MENSAGEM
      let finalMessage = campaign.message_template
      if (lead.name) {
        finalMessage = finalMessage.replace(/\{nome\}/gi, lead.name)
      } else {
        // Fallback genérico caso não tenha nome no banco
        finalMessage = finalMessage.replace(/\{nome\}/gi, 'amigo(a)')
      }

      // 5. ENVIAR VIA EVOLUTION API
      try {
        const remoteJid = `${lead.phone}@s.whatsapp.net`
        const evolutionUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL
        const globalApiKey = process.env.EVOLUTION_API_KEY
        const instanceName = instance.instance_name

        const sendBody = {
          number: remoteJid,
          text: finalMessage,
          delay: 1200 // typing delay em ms
        }

        const res = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': globalApiKey!
          },
          body: JSON.stringify(sendBody)
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(JSON.stringify(errorData))
        }

        // Sucesso: Atualiza lead para sent
        await supabase
          .from('campaign_leads')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', lead.id)

        processedLogs.push({ campaign_id: campaign.id, lead_id: lead.id, status: 'sent', phone: lead.phone })

      } catch (sendError: any) {
        // Falha no disparo (ex: numero invalido, evolution offline)
        await supabase
          .from('campaign_leads')
          .update({ 
            status: 'failed', 
            error_log: sendError.message || 'Erro desconhecido',
            sent_at: new Date().toISOString() // usamos sent_at pra não travar a fila
          })
          .eq('id', lead.id)

        processedLogs.push({ campaign_id: campaign.id, lead_id: lead.id, status: 'failed', error: sendError.message })
      }
    }

    return NextResponse.json({ success: true, processedLogs })

  } catch (error: any) {
    console.error('CRON Erro Crítico:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
