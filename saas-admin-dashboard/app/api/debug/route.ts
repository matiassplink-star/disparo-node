import { NextResponse } from 'next/server'

// Endpoint temporário de diagnóstico — remover após confirmar funcionamento
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const evoUrl = process.env.EVOLUTION_API_URL
  const evoKey = process.env.EVOLUTION_API_KEY

  return NextResponse.json({
    supabase_url: supabaseUrl ? '✅ ' + supabaseUrl.substring(0, 30) + '...' : '❌ MISSING',
    service_role: serviceRole ? '✅ set (' + serviceRole.length + ' chars)' : '❌ MISSING',
    evolution_url: evoUrl ? '✅ ' + evoUrl : '❌ MISSING',
    evolution_key: evoKey ? '✅ set (' + evoKey.length + ' chars)' : '❌ MISSING',
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
}
