-- ============================================
-- ZAPLINK 2.0 — FASE 0: NOVAS TABELAS
-- Execute no Supabase SQL Editor:
-- https://supabase.com/dashboard → seu projeto → SQL Editor
-- ============================================
-- ⚠️ NÃO ALTERA tabelas existentes (users, accounts, tutoriais, pagamentos, registros_ip)
-- Apenas ADICIONA as novas tabelas para WhatsApp, Chat, CRM, e Agente IA.
-- ============================================


-- ─────────────────────────────────────────────
-- 1. INSTÂNCIAS WHATSAPP (uma por número conectado)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_name VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connecting', 'connected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on whatsapp_instances"
  ON whatsapp_instances FOR ALL USING (true) WITH CHECK (true);

-- Trigger auto-update
CREATE TRIGGER trigger_whatsapp_instances_updated
  BEFORE UPDATE ON whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();


-- ─────────────────────────────────────────────
-- 2. CONTATOS IMPORTADOS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  is_valid BOOLEAN DEFAULT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on contacts"
  ON contacts FOR ALL USING (true) WITH CHECK (true);

-- Índice para busca rápida por telefone
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(user_id, phone);


-- ─────────────────────────────────────────────
-- 3. MENSAGENS (histórico de chat)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
  remote_jid VARCHAR(50) NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type VARCHAR(20),
  from_me BOOLEAN DEFAULT FALSE,
  message_type VARCHAR(20) DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'sticker')),
  status VARCHAR(20) DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on messages"
  ON messages FOR ALL USING (true) WITH CHECK (true);

-- Índices para performance do chat
CREATE INDEX IF NOT EXISTS idx_messages_user_jid ON messages(user_id, remote_jid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_instance ON messages(instance_id, created_at DESC);

-- ⚡ Habilitar Realtime para mensagens (chat ao vivo no frontend)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;


-- ─────────────────────────────────────────────
-- 4. CRM KANBAN — COLUNAS DO FUNIL
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  color VARCHAR(7) DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crm_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on crm_columns"
  ON crm_columns FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────
-- 5. CRM KANBAN — CARDS (LEADS)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES crm_columns(id) ON DELETE CASCADE,
  contact_phone VARCHAR(20) NOT NULL,
  contact_name VARCHAR(255),
  notes TEXT,
  value DECIMAL(10,2),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crm_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on crm_cards"
  ON crm_cards FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trigger_crm_cards_updated
  BEFORE UPDATE ON crm_cards
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();


-- ─────────────────────────────────────────────
-- 6. CAMPANHAS DE DISPARO EM MASSA
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  message_text TEXT,
  media_url TEXT,
  total INT DEFAULT 0,
  sent INT DEFAULT 0,
  failed INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'cancelled', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on campaigns"
  ON campaigns FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────
-- 7. AGENTE SDR (configuração por usuário)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL DEFAULT 'Assistente',
  role VARCHAR(255) DEFAULT 'Assistente de Vendas',
  tone VARCHAR(50) DEFAULT 'amigavel'
    CHECK (tone IN ('formal', 'amigavel', 'direto', 'consultivo')),
  objective TEXT,
  provider VARCHAR(50) DEFAULT 'openai'
    CHECK (provider IN ('openai', 'google', 'anthropic')),
  model VARCHAR(100) DEFAULT 'gpt-4o',
  api_key_encrypted TEXT,
  business_hours_start TIME DEFAULT '08:00',
  business_hours_end TIME DEFAULT '18:00',
  out_of_hours_message TEXT DEFAULT 'Olá! Nosso horário de atendimento é de segunda a sexta, das 08h às 18h. Retornaremos em breve!',
  max_messages_per_lead INT DEFAULT 20,
  transfer_keyword VARCHAR(100) DEFAULT 'humano',
  active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on agents"
  ON agents FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trigger_agents_updated
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();


-- ─────────────────────────────────────────────
-- 8. BASE DE CONHECIMENTO RAG (vetorial)
-- ─────────────────────────────────────────────
-- ⚠️ Requer extensão pgvector habilitada no Supabase
-- Vá em: Database → Extensions → Procure "vector" → Enable
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_index INT DEFAULT 0,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on knowledge_base"
  ON knowledge_base FOR ALL USING (true) WITH CHECK (true);

-- Índice vetorial para busca por similaridade (IVFFlat)
-- Nota: precisa de pelo menos 100 registros para funcionar bem
-- Se tiver poucos registros, use busca exata (sem índice)
-- CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);


-- ─────────────────────────────────────────────
-- 9. HISTÓRICO DE CONVERSAS DO AGENTE (memória)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  remote_jid VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on agent_conversations"
  ON agent_conversations FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agent_conv_lookup
  ON agent_conversations(user_id, agent_id, remote_jid, created_at DESC);


-- ─────────────────────────────────────────────
-- 10. FUNÇÃO AUXILIAR: Busca RAG por similaridade
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_user_id UUID,
  match_agent_id UUID,
  match_count INT DEFAULT 4
)
RETURNS TABLE (
  id UUID,
  chunk_text TEXT,
  filename VARCHAR,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.chunk_text,
    kb.filename,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE kb.user_id = match_user_id
    AND kb.agent_id = match_agent_id
    AND kb.embedding IS NOT NULL
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- ============================================
-- ✅ FASE 0 CONCLUÍDA
-- Tabelas criadas: 9 novas
-- Funções criadas: 1 (match_knowledge)
-- Extensões: vector (pgvector)
-- Realtime: habilitado para messages
-- ============================================
