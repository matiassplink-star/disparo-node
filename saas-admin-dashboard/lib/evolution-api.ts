const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ''

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: process.env.EVOLUTION_API_KEY || EVOLUTION_KEY,
  }
}

// ─── Instâncias ──────────────────────────────────────────────

export async function createInstance(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
    method: 'POST',
    headers: getHeaders(),
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
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error(`Falha ao buscar QR Code: ${res.status}`)
  return res.json() // { base64, count }
}

export async function getInstanceStatus(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
    headers: getHeaders(),
  })
  if (!res.ok) return { state: 'unknown' }
  return res.json() // { instance: { state: 'open' | 'close' | 'connecting' } }
}

export async function getInstanceDetails(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
    headers: getHeaders(),
  })
  if (!res.ok) return null
  const data = await res.json()
  // Evolution returns an array of instances
  return data && data.length > 0 ? data[0] : null
}

export async function logoutInstance(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/instance/logout/${instanceName}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  return res.ok
}

export async function deleteInstance(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  return res.ok
}

// ─── Mensagens ───────────────────────────────────────────────

export async function sendTextMessage(instanceName: string, number: string, text: string) {
  const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ number, text }),
  })
  if (!res.ok) throw new Error(`Falha ao enviar mensagem: ${res.status}`)
  return res.json()
}

// Busca lista de chats da instância (para sync manual)
export async function getChats(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/chat/findChats/${instanceName}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({}),
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// Busca últimas mensagens de um contato específico
export async function getMessages(
  instanceName: string,
  remoteJid: string,
  limit = 30
) {
  const res = await fetch(`${EVOLUTION_URL}/chat/findMessages/${instanceName}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      where: { key: { remoteJid } },
      limit,
    }),
  })
  if (!res.ok) return []
  const data = await res.json()
  // A Evolution retorna { messages: { records: [...] } }
  return data?.messages?.records || data?.records || (Array.isArray(data) ? data : [])
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
    headers: getHeaders(),
    body: JSON.stringify({ number, mediaUrl, caption, mediatype: mediaType }),
  })
  if (!res.ok) throw new Error(`Falha ao enviar mídia: ${res.status}`)
  return res.json()
}

// ─── Validação de Números ─────────────────────────────────────

export async function checkNumbers(instanceName: string, numbers: string[]) {
  const res = await fetch(`${EVOLUTION_URL}/chat/whatsappNumbers/${instanceName}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ numbers }),
  })
  if (!res.ok) throw new Error(`Falha ao verificar números: ${res.status}`)
  return res.json() // Array de { number, exists, jid }
}

// ─── Webhook por Instância (auto-config ao criar) ────────────
// Clientes nunca precisam tocar na Evolution API.
// O webhook é configurado automaticamente ao criar a instância.
export async function setInstanceWebhook(instanceName: string, webhookUrl: string) {
  const res = await fetch(`${EVOLUTION_URL}/webhook/set/${instanceName}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      webhook: {
        url: webhookUrl,
        enabled: true,
        webhookByEvents: false,
        webhookBase64: false,
        events: [
          'APPLICATION_STARTUP',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
          'CHATS_SET',
          'CHATS_UPSERT',
          'CHATS_UPDATE',
          'MESSAGES_SET',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'CONTACTS_SET',
          'CONTACTS_UPSERT',
          'CONTACTS_UPDATE',
          'PRESENCE_UPDATE'
        ],
      }
    }),
  })
  // Não joga erro — é melhor esforco
  if (!res.ok) {
    console.warn(`[Evolution] Falha ao configurar webhook da instância ${instanceName}: ${res.status}`)
  }
  return res.ok
}
