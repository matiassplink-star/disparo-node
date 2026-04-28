# Fase 0 — Banco de Dados (Supabase)

**Status:** ✅ CONCLUÍDA — SQL executado com sucesso  
**Data:** 28/04/2026  

---

## O Que Foi Criado

Arquivo SQL: `saas-admin-dashboard/supabase-zaplink2.sql`

### Novas Tabelas (9 total)

| # | Tabela | Finalidade | Campos Chave |
|---|--------|-----------|--------------|
| 1 | `whatsapp_instances` | Sessões WhatsApp (1 por número) | `instance_name`, `status`, `phone_number` |
| 2 | `contacts` | Contatos importados/extraídos | `phone`, `name`, `is_valid`, `tags[]` |
| 3 | `messages` | Histórico de todas as mensagens | `remote_jid`, `content`, `from_me`, `media_url` |
| 4 | `crm_columns` | Colunas do Kanban (funil) | `title`, `position`, `color` |
| 5 | `crm_cards` | Cards/Leads do Kanban | `contact_phone`, `column_id`, `value`, `notes` |
| 6 | `campaigns` | Campanhas de disparo em massa | `message_text`, `total`, `sent`, `failed`, `status` |
| 7 | `agents` | Configuração do Agente SDR | `provider`, `model`, `api_key_encrypted`, `tone`, `active` |
| 8 | `knowledge_base` | Base de conhecimento RAG (vetorial) | `chunk_text`, `embedding vector(1536)` |
| 9 | `agent_conversations` | Memória das conversas do agente | `role`, `content`, `remote_jid` |

### Extras
- **Extensão:** `pgvector` habilitada para busca vetorial
- **Realtime:** habilitado na tabela `messages` (chat ao vivo)
- **Função SQL:** `match_knowledge()` para busca RAG por similaridade
- **RLS:** habilitado em todas as tabelas (segurança)
- **Triggers:** `updated_at` automático em `whatsapp_instances`, `crm_cards`, `agents`

### Tabelas existentes NÃO ALTERADAS
- `users` ✅ intacta
- `accounts` ✅ intacta
- `tutoriais` ✅ intacta
- `pagamentos` ✅ intacta
- `registros_ip` ✅ intacta

---

## Instruções Para Executar

1. Abra o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione o seu projeto ZapLink
3. Vá em **Database → Extensions** → Procure `vector` → Clique **Enable**
4. Vá em **SQL Editor** → Clique **New Query**
5. Cole TODO o conteúdo do arquivo `supabase-zaplink2.sql`
6. Clique **Run** (executar)
7. Deve retornar **"Success. No rows returned"** — isso é normal

## Critérios de Validação

- [ ] Todas as 9 tabelas aparecem em Database → Tables
- [ ] A extensão `vector` está habilitada em Database → Extensions
- [ ] Ir em Table Editor → `messages` → ver que a tabela existe e está vazia
- [ ] Ir em Table Editor → `agents` → ver que a tabela existe e está vazia

---

## Próximo Passo

Quando o SQL executar com sucesso → **Fase 1: Conexão WhatsApp via Evolution API**
