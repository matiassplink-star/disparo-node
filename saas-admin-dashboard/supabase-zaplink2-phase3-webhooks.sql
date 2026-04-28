-- Criação da tabela de logs do Webhook (Store-and-Forward / Inbox Pattern)
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  error text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Índices para otimizar a leitura do Worker
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
