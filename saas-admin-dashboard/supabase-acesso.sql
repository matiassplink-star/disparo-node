-- ============================================
-- EXECUTE NO SUPABASE SQL EDITOR
-- Novas tabelas e colunas para o SaaS
-- ============================================

-- 1. Adicionar campo de acesso temporal
ALTER TABLE users ADD COLUMN IF NOT EXISTS acesso_ate TIMESTAMPTZ DEFAULT NULL;

-- 2. Adicionar campo de telefone
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefone TEXT DEFAULT NULL;

-- 3. Campos para verificação de email
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMPTZ DEFAULT NULL;

-- 3. Tabela de tutoriais
CREATE TABLE IF NOT EXISTS tutoriais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  youtube_url TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Permitir leitura pública dos tutoriais
ALTER TABLE tutoriais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutoriais são visíveis para todos" ON tutoriais
  FOR SELECT USING (true);
CREATE POLICY "Apenas service_role pode gerenciar tutoriais" ON tutoriais
  FOR ALL USING (true);

-- 4. Tabela de registro de IPs (anti-abuso)
CREATE TABLE IF NOT EXISTS registros_ip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  email TEXT NOT NULL,
  user_agent TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE registros_ip ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role gerencia registros_ip" ON registros_ip
  FOR ALL USING (true);

-- 5. Tabela de pagamentos (para Mercado Pago)
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  plano TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  gateway TEXT DEFAULT 'mercadopago',
  gateway_id TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role gerencia pagamentos" ON pagamentos
  FOR ALL USING (true);
