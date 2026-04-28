import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// Webhook Resiliente em Serverless (Inbox Pattern)
// Recebe TODOS os webhooks da Evolution API de forma NÃO BLOQUEANTE
export async function POST(request: NextRequest) {
  try {
    // Parsing robusto
    const bodyText = await request.text();
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = { raw: bodyText };
    }

    const supabase = getSupabase()

    // 🔥 SALVAR RAW IMEDIATAMENTE (Store-and-Forward)
    // Usamos service role via getSupabase() para não nos preocuparmos com RLS
    const { error } = await supabase
      .from('webhook_logs')
      .insert({
        payload: body,
        processed: false
      });

    if (error) {
      console.error('[/api/webhook/evolution] Erro ao salvar log:', error.message);
    }

    // 🔥 RESPONDER 200 RÁPIDO (Menos de 1 segundo)
    // Sempre respondemos 200 para a Evolution não re-tentar loucamente e derrubar a fila
    return NextResponse.json({ ok: true, received: true });

  } catch (err) {
    console.error('[/api/webhook/evolution] Erro Crítico:', err);
    return NextResponse.json({ ok: true, error: true }); // ⚠️ Sempre 200
  }
}
