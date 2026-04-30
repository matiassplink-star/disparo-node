# Plano de Ação: Sistema de Disparo em Massa (Bulk Messaging)

Este plano descreve a arquitetura e os passos de implementação para trazer a funcionalidade de "Disparo em Massa" do antigo sistema legado (Node.js) para dentro da nova plataforma SaaS (ZapLink 2.0 / Next.js).

## 1. Arquitetura de Banco de Dados (Supabase)
Precisaremos de duas novas tabelas para gerenciar os disparos de forma escalável e sem perder o progresso caso o servidor reinicie:

- **`campaigns` (Campanhas)**
  - `id`, `user_id`, `instance_id` (Qual número fará o disparo)
  - `name` (Nome da campanha)
  - `message_template` (O texto base do disparo, ex: "Olá {nome}...")
  - `media_url` (Opcional, para imagem/documento)
  - `status` ('draft', 'running', 'paused', 'completed', 'error')
  - `delay_min`, `delay_max` (Segundos de intervalo entre mensagens para evitar ban)
  - `created_at`, `updated_at`

- **`campaign_leads` (Contatos da Campanha)**
  - `id`, `campaign_id`
  - `phone` (Número do lead limpo)
  - `name` (Nome do lead para variáveis)
  - `status` ('pending', 'processing', 'sent', 'failed')
  - `error_log` (Motivo da falha, se houver)
  - `sent_at`

## 2. Frontend: Painel de Disparos (`/dashboard/disparos`)
- **Tela Principal**: Lista das campanhas ativas e finalizadas, com barras de progresso (Ex: 500/1000 enviados).
- **Nova Campanha**:
  - Seleção da Instância de WhatsApp ativa.
  - Caixa de texto da mensagem (suporte a `{nome}`).
  - Configuração de Delay (ex: 15 a 30 segundos).
  - **Upload de Contatos**: Aceitar CSV, TXT ou colar números separados por vírgula.
- **Detalhes da Campanha**: Um painel em tempo real para pausar/retomar o disparo e ver a lista de contatos que falharam ou tiveram sucesso.

## 3. Backend e Fila de Disparo (Cron Worker)
Como estamos na Vercel (Serverless), um loop "infinito" de disparos dá timeout (erro 504). Faremos igual ao webhook:
- **`POST /api/disparos/create`**: Recebe os dados e salva os milhares de leads no banco como `pending` rapidamente. Retorna "Sucesso" para a UI.
- **`GET /api/cron/process-disparos`**: Um worker (acionado a cada minuto) que busca no banco:
  - Seleciona as campanhas em `running`.
  - Pega um lote de leads `pending` (respeitando o tempo de `delay`).
  - Dispara a mensagem via Evolution API.
  - Atualiza o lead para `sent` e a campanha para `completed` quando acabar.

## Fases de Implementação

- [ ] **Fase 1: Setup do Banco de Dados**
  - Criar o arquivo SQL (`supabase-campaigns.sql`) para criar tabelas, políticas RLS e os gatilhos necessários.
- [ ] **Fase 2: UI e Criação de Campanhas**
  - Construir as páginas no Next.js (`/dashboard/disparos/page.tsx` e `/dashboard/disparos/novo/page.tsx`).
  - Desenvolver lógica de importação de CSV/TXT no frontend.
  - Criar a API `/api/disparos/create` para salvar os lotes no Supabase de forma otimizada.
- [ ] **Fase 3: O Motor de Disparo (Worker)**
  - Criar o endpoint `/api/cron/process-disparos`.
  - Implementar o parser de variáveis (trocar `{nome}` pelo nome real do lead).
  - Integrar com o helper da Evolution API (`sendTextMessage` e mídias).
- [ ] **Fase 4: Testes de Stress e Anti-Ban**
  - Testar envio simulado de 100 mensagens.
  - Validar os delays (ex: espera de 10s entre envios).
