-- ============================================
-- ZAPLINK 2.0 — FASE 5: CRM Avançado (IA + Tickets)
-- Execute no Supabase SQL Editor para ativar as novas funções
-- ============================================

-- 1. Novas colunas na tabela de contatos
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_active boolean DEFAULT true;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS chat_status text DEFAULT 'open';

-- 2. Atualizar a View v_chat_list para incluir o status da IA
CREATE OR REPLACE VIEW v_chat_list AS
SELECT DISTINCT ON (m.user_id, m.remote_jid)
  c.id           AS contact_id,
  c.name         AS contact_name,
  c.phone        AS contact_phone,
  c.chat_status,
  c.ai_active, -- Nova coluna incluída na view
  c.tags,
  m.user_id,
  m.remote_jid,
  m.content      AS last_message,
  m.from_me      AS last_from_me,
  m.created_at   AS last_message_at,
  m.message_type AS last_message_type
FROM messages m
LEFT JOIN contacts c
  ON c.user_id = m.user_id
  AND c.phone = m.remote_jid
WHERE
  m.remote_jid NOT LIKE '%@g.us'
  AND m.remote_jid <> 'status@broadcast'
ORDER BY
  m.user_id,
  m.remote_jid,
  m.created_at DESC;

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_contacts_ai_status ON contacts(user_id, ai_active, chat_status);

-- 4. Confirmar que a view está ok
-- SELECT ai_active FROM v_chat_list LIMIT 1;
