-- ============================================
-- ZAPLINK 2.0 — PATCH: external_id em messages
-- Execute no Supabase SQL Editor
-- Evita mensagens duplicadas ao reconectar
-- ============================================

-- 1. Adicionar coluna external_id (ID da mensagem na Evolution API / WhatsApp)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_id TEXT;

-- 2. Criar constraint UNIQUE para evitar duplicatas
--    (user_id + external_id) garante unicidade por conta
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id 
  ON messages(user_id, external_id) 
  WHERE external_id IS NOT NULL;

-- 3. Adicionar coluna de status de leitura (se não existir já como check)
--    (a tabela já tem status com check, só garantindo que 'read' está incluso)
-- O schema original já tem: CHECK (status IN ('sent', 'delivered', 'read', 'failed'))
-- Então só precisamos garantir que o campo existe mesmo.

-- 4. Verificar resultado
SELECT 
  column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;
