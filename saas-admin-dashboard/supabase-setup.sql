-- ============================================
-- SQL para DELETAR e RECRIAR as tabelas
-- Execute no Supabase SQL Editor:
-- https://supabase.com/dashboard → seu projeto → SQL Editor
-- ============================================

-- 1. DELETAR tabelas existentes (na ordem certa por causa das foreign keys)
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. CRIAR tabela users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  plano TEXT NOT NULL DEFAULT 'free' CHECK (plano IN ('free', 'pro', 'admin')),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'bloqueado')),
  email_verified BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CRIAR tabela accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  limite_envios INTEGER NOT NULL DEFAULT 100,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Habilitar RLS (Row Level Security) - exigido pelo Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de segurança (permite acesso via service_role key do backend)
CREATE POLICY "Service role full access on users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on accounts"
  ON accounts FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Trigger para atualizar 'atualizado_em' automaticamente
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_atualizado_em
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();

-- ============================================
-- 7. CRIAR USUÁRIO ADMIN (execute DEPOIS do SQL acima)
-- ============================================
-- IMPORTANTE: Primeiro crie o usuário pela API de registro
-- ou pelo painel do Supabase (Authentication > Users > Add User)
-- com email e senha. Depois copie o UUID gerado e execute:
--
-- UPDATE users SET plano = 'admin' WHERE email = 'seu-email@exemplo.com';
