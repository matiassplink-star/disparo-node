-- ============================================
-- BACKFILL: Criar contatos a partir das mensagens existentes
-- Executa no Supabase SQL Editor
-- ============================================

-- 1. Criar contatos únicos a partir de mensagens existentes
INSERT INTO contacts (user_id, instance_id, phone, name, chat_status, created_at)
SELECT DISTINCT ON (m.user_id, m.remote_jid)
  m.user_id,
  m.instance_id,
  m.remote_jid AS phone,
  m.remote_jid AS name,  -- nome será o número por enquanto
  'open' AS chat_status,
  NOW() AS created_at
FROM messages m
WHERE 
  m.remote_jid IS NOT NULL
  AND m.remote_jid NOT LIKE '%@g.us'  -- ignorar grupos
  AND m.remote_jid != 'status@broadcast'
ON CONFLICT (user_id, phone) DO NOTHING;

-- 2. Confirmar resultado
SELECT COUNT(*) as total_contatos FROM contacts;
SELECT COUNT(*) as total_mensagens FROM messages;
