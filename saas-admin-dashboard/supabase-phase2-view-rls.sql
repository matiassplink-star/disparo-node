-- ============================================
-- ZAPLINK 2.0 — FASE 2: Performance + Segurança
-- Execute no Supabase SQL Editor
-- ============================================

-- ─────────────────────────────────────────────
-- 1. VIEW: última mensagem por conversa
--    Usa DISTINCT ON para eficiência real no banco
--    Substitui o Map em JS que carrega tudo
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW v_chat_list AS
SELECT DISTINCT ON (m.user_id, m.remote_jid)
  c.id           AS contact_id,
  c.name         AS contact_name,
  c.phone        AS contact_phone,
  c.chat_status,
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

-- ─────────────────────────────────────────────
-- 2. RLS SEGURA: messages por user_id
--    Remove o USING (true) que deixa qualquer
--    cliente anônimo ler msgs de outros usuários
-- ─────────────────────────────────────────────

-- messages
DROP POLICY IF EXISTS "Service role full access on messages" ON messages;
CREATE POLICY "Usuário vê apenas suas mensagens"
  ON messages FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Service role gerencia messages"
  ON messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- contacts
DROP POLICY IF EXISTS "Service role full access on contacts" ON contacts;
CREATE POLICY "Usuário vê apenas seus contatos"
  ON contacts FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Service role gerencia contacts"
  ON contacts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- crm_columns
DROP POLICY IF EXISTS "Service role full access on crm_columns" ON crm_columns;
CREATE POLICY "Usuário vê apenas suas colunas"
  ON crm_columns FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Service role gerencia crm_columns"
  ON crm_columns FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- crm_cards
DROP POLICY IF EXISTS "Service role full access on crm_cards" ON crm_cards;
CREATE POLICY "Usuário vê apenas seus cards"
  ON crm_cards FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Service role gerencia crm_cards"
  ON crm_cards FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- whatsapp_instances
DROP POLICY IF EXISTS "Service role full access on whatsapp_instances" ON whatsapp_instances;
CREATE POLICY "Usuário vê apenas sua instância"
  ON whatsapp_instances FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Service role gerencia instâncias"
  ON whatsapp_instances FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- 3. Confirmar view funcionando
-- ─────────────────────────────────────────────
-- SELECT COUNT(*) FROM v_chat_list;
-- SELECT * FROM v_chat_list LIMIT 5;
