-- ============================================
-- ZAPLINK 2.0 — FASE 2: EQUIPE, ETIQUETAS E FOLLOW-UP
-- Execute no Supabase SQL Editor
-- ============================================

-- ─────────────────────────────────────────────
-- 1. HIERARQUIA DE EQUIPE (RBAC)
-- Adicionando colunas na tabela users existente
-- ─────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'master';
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────
-- 2. ETIQUETAS (TAGS) CUSTOMIZADAS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on labels"
  ON labels FOR ALL USING (true) WITH CHECK (true);

-- Tabela de relacionamento: Contatos <-> Etiquetas
CREATE TABLE IF NOT EXISTS contact_labels (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (contact_id, label_id)
);

ALTER TABLE contact_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on contact_labels"
  ON contact_labels FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────
-- 3. FOLLOW-UPS (MENSAGENS AGENDADAS / RETORNO)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  message_text TEXT, -- Mensagem opcional para disparo automático
  status VARCHAR(20) DEFAULT 'pending' -- pending | sent | cancelled
    CHECK (status IN ('pending', 'sent', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on follow_ups"
  ON follow_ups FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 4. STATUS DA CONVERSA (Inbox Management)
-- Adicionando controle de status nos contatos para "Ativar/Desativar" ou "Resolver"
-- ─────────────────────────────────────────────
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS chat_status VARCHAR(20) DEFAULT 'open'
  CHECK (chat_status IN ('open', 'closed', 'paused_ai'));

-- ─────────────────────────────────────────────
-- 5. CAMPOS EXTRAS NO CRM CARDS
-- ─────────────────────────────────────────────
ALTER TABLE crm_cards ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE crm_cards ADD COLUMN IF NOT EXISTS expected_close_date DATE;
