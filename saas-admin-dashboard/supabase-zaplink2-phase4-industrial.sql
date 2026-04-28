-- Evolução Industrial da Tabela webhook_logs
-- 1. Controle de concorrência e falhas
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS processing boolean DEFAULT false;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- 2. Índice otimizado para o SKIP LOCKED
CREATE INDEX IF NOT EXISTS idx_webhook_logs_queue ON webhook_logs(processed, processing, retry_count);

-- 3. Função RPC Profissional com SKIP LOCKED (Garante que 2 workers não processem a mesma mensagem)
CREATE OR REPLACE FUNCTION get_unprocessed_webhooks(batch_size int DEFAULT 50)
RETURNS SETOF webhook_logs AS $$
BEGIN
  RETURN QUERY
  UPDATE webhook_logs
  SET processing = true
  WHERE id IN (
    SELECT id FROM webhook_logs
    WHERE processed = false 
      AND processing = false
      AND retry_count < 3
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT batch_size
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- 4. Função para auto-limpeza do banco de dados (Evita crescimento infinito)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL '7 days' AND processed = true;
END;
$$ LANGUAGE plpgsql;
