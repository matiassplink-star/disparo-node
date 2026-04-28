-- Evolução Industrial da Tabela webhook_logs (FINAL)

-- 1. Controle de concorrência e falhas
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS processing boolean DEFAULT false;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS failed boolean DEFAULT false;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 2. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_webhook_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_webhook_logs_updated_at ON webhook_logs;
CREATE TRIGGER trg_webhook_logs_updated_at
BEFORE UPDATE ON webhook_logs
FOR EACH ROW
EXECUTE FUNCTION update_webhook_logs_timestamp();

-- 3. Índice Otimizado (com created_at para ORDER BY)
DROP INDEX IF EXISTS idx_webhook_logs_queue;
CREATE INDEX idx_webhook_logs_queue ON webhook_logs(processed, processing, retry_count, created_at);

-- 4. Função RPC Profissional com CTE + SKIP LOCKED + Timeout de Travamento
DROP FUNCTION IF EXISTS get_unprocessed_webhooks(int);
DROP FUNCTION IF EXISTS get_unprocessed_webhooks();

CREATE OR REPLACE FUNCTION get_unprocessed_webhooks(batch_size int DEFAULT 50)
RETURNS SETOF webhook_logs AS $$
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT id
    FROM webhook_logs
    WHERE processed = false 
      AND (processing = false OR updated_at < NOW() - INTERVAL '5 minutes')
      AND failed = false
      AND retry_count < 3
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT batch_size
  )
  UPDATE webhook_logs w
  SET processing = true, updated_at = NOW()
  FROM cte
  WHERE w.id = cte.id
  RETURNING w.*;
END;
$$ LANGUAGE plpgsql;

-- 5. Auto-limpeza do banco em Lotes (evita lock no banco apagando tudo de vez)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_logs
  WHERE id IN (
    SELECT id FROM webhook_logs
    WHERE created_at < NOW() - INTERVAL '7 days'
    LIMIT 1000
  );
END;
$$ LANGUAGE plpgsql;

-- 6. View de Métricas do Webhook (Monitoramento)
CREATE OR REPLACE VIEW vw_webhook_metrics AS
SELECT 
  COUNT(*) FILTER (WHERE processed = false AND failed = false) AS queue_pending,
  COUNT(*) FILTER (WHERE processing = true) AS queue_processing,
  COUNT(*) FILTER (WHERE failed = true) AS queue_failed,
  COUNT(*) FILTER (WHERE processed = true) AS total_processed
FROM webhook_logs;
