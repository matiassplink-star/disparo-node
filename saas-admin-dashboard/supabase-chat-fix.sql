-- ============================================================
-- ZapLink: Setup Webhook Processing (T8/T9/T10)
-- Rodar no Supabase SQL Editor em uma única execução
-- ============================================================

-- 1. Garantir colunas necessárias na webhook_logs
ALTER TABLE webhook_logs
  ADD COLUMN IF NOT EXISTS processing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS failed    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retry_count int    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error     text;

-- 2. Índice para acelerar a query de dequeue
CREATE INDEX IF NOT EXISTS idx_webhook_logs_queue
  ON webhook_logs (processed, processing, failed, retry_count, created_at)
  WHERE processed = false AND processing = false AND failed = false;

-- 3. RPC get_unprocessed_webhooks (SKIP LOCKED = sem concorrência)
CREATE OR REPLACE FUNCTION get_unprocessed_webhooks(batch_size int DEFAULT 10)
RETURNS SETOF webhook_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE webhook_logs
  SET processing = true
  WHERE id IN (
    SELECT id FROM webhook_logs
    WHERE processed = false
      AND processing = false
      AND failed     = false
      AND (retry_count IS NULL OR retry_count < 3)
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;

-- 4. RPC cleanup_old_webhook_logs (remove logs processados com +7 dias)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM webhook_logs
  WHERE processed = true
    AND created_at < NOW() - INTERVAL '7 days';
$$;

-- 5. Ativar Realtime para tabela messages (se não estiver)
-- No Supabase Dashboard: Database → Replication → supabase_realtime → Adicionar 'messages'
-- Ou via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verificação final
SELECT proname, prosrc IS NOT NULL as ok
FROM pg_proc
WHERE proname IN ('get_unprocessed_webhooks', 'cleanup_old_webhook_logs');
