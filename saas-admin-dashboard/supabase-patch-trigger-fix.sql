-- ============================================
-- PATCH: Corrigir trigger com campo errado
-- O trigger estava referenciando 'atualizado_em' 
-- mas a coluna é 'updated_at'
-- ============================================

-- 1. Remove o trigger antigo com o nome errado
DROP TRIGGER IF EXISTS trigger_whatsapp_instances_updated ON whatsapp_instances;

-- 2. Garante que a função correta existe
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recria o trigger usando a função correta
CREATE TRIGGER trigger_whatsapp_instances_updated
  BEFORE UPDATE ON whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Corrigir também em crm_cards se existir
DROP TRIGGER IF EXISTS trigger_crm_cards_updated ON crm_cards;
CREATE TRIGGER trigger_crm_cards_updated
  BEFORE UPDATE ON crm_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Agora atualiza o status da instância conectada
UPDATE whatsapp_instances 
SET status = 'connected', phone_number = '553499008061'
WHERE instance_name = 'splink-1b115b8b';

-- 6. Confirmar
SELECT id, instance_name, status, phone_number FROM whatsapp_instances;
