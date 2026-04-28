import { createClient } from '@supabase/supabase-js'

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ''

if (!EVOLUTION_URL || !EVOLUTION_KEY) {
  console.warn('⚠️ EVOLUTION_API_URL ou EVOLUTION_API_KEY não definidos.')
}

const defaultHeaders = {
  'Content-Type': 'application/json',
  apikey: EVOLUTION_KEY,
}

// ─── Instâncias ──────────────────────────────────────────────

export async function createInstance(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }),
  })
  if (!res.ok) throw new Error(`Falha ao criar instância: ${res.status}`)
  return res.json()
}

export async function getQRCode(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
    headers: defaultHeaders,
  })
  if (!res.ok) throw new Error(`Falha ao buscar QR Code: ${res.status}`)
  return res.json() // { base64, count }
}

export async function getInstanceStatus(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
    headers: defaultHeaders,
  })
  if (!res.ok) return { state: 'unknown' }
  return res.json() // { instance: { state: 'open' | 'close' | 'connecting' } }
}

export async function logoutInstance(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/instance/logout/${instanceName}`, {
    method: 'DELETE',
    headers: defaultHeaders,
  })
  return res.ok
}

export async function deleteInstance(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers: defaultHeaders,
  })
  return res.ok
}

// ─── Mensagens ───────────────────────────────────────────────

export async function sendTextMessage(instanceName: string, number: string, text: string) {
  const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ number, text }),
  })
  if (!res.ok) throw new Error(`Falha ao enviar mensagem: ${res.status}`)
  return res.json()
}

export async function sendMediaMessage(
  instanceName: string,
  number: string,
  mediaUrl: string,
  caption: string,
  mediaType: 'image' | 'video' | 'document' | 'audio'
) {
  const res = await fetch(`${EVOLUTION_URL}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ number, mediaUrl, caption, mediatype: mediaType }),
  })
  if (!res.ok) throw new Error(`Falha ao enviar mídia: ${res.status}`)
  return res.json()
}

// ─── Validação de Números ─────────────────────────────────────

export async function checkNumbers(instanceName: string, numbers: string[]) {
  const res = await fetch(`${EVOLUTION_URL}/chat/whatsappNumbers/${instanceName}`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ numbers }),
  })
  if (!res.ok) throw new Error(`Falha ao verificar números: ${res.status}`)
  return res.json() // Array de { number, exists, jid }
}

// ─── Configurar Webhook Global ────────────────────────────────

export async function setGlobalWebhook(webhookUrl: string) {
  const res = await fetch(`${EVOLUTION_URL}/webhook/set`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      url: webhookUrl,
      enabled: true,
      webhookByEvents: false,
      webhookBase64: false,
      events: [
        'messages.upsert',
        'connection.update',
        'qrcode.updated',
      ],
    }),
  })
  if (!res.ok) throw new Error(`Falha ao configurar webhook: ${res.status}`)
  return res.json()
}
