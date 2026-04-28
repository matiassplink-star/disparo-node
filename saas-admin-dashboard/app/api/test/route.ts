import { NextRequest, NextResponse } from 'next/server'

// Healthcheck interno — não expõe informações sensíveis
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'ok', ts: Date.now() })
}
