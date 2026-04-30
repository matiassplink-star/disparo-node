# ZapLink 2.0 — Documentação Completa de Funções do Sistema

Esta documentação descreve em detalhes todas as funções de back-end (API Routes), as arquiteturas de dados e as integrações que compõem o SaaS ZapLink 2.0.

---

## 1. Visão Geral da Arquitetura

O ZapLink 2.0 opera com uma stack moderna composta por:
- **Frontend / Backend**: Next.js 14+ (App Router).
- **Banco de Dados & Autenticação**: Supabase (PostgreSQL, Row Level Security - RLS).
- **Gerenciamento de Estado**: Zustand.
- **Motor de WhatsApp**: Evolution API v2.
- **Pagamentos**: Mercado Pago (Checkout e Webhooks).

---

## 2. Autenticação & Gestão de Usuários (`/api/auth` e `/api/users`)

O sistema suporta Role-Based Access Control (RBAC) com níveis de "admin" e "member". O acesso e os planos são controlados nativamente via banco de dados e cookies HTTP-only.

### Endpoints de Autenticação (`/api/auth/*`)
- **`POST /api/auth/register`**: Registra novos usuários na plataforma (cria via Supabase Auth) e inicializa um perfil atrelado à tabela `users` com o plano `free`.
- **`POST /api/auth/login`**: Realiza o login (Email/Senha). Define o cookie seguro `sb-access-token` para Session State Management persistente.
- **`POST /api/auth/logout`**: Encerra a sessão deletando o cookie.
- **`GET /api/auth/me`**: Retorna os detalhes do usuário atual baseado no cookie da sessão ativa.
- **`GET /api/auth/verify-email`**: Manipula confirmações de verificação de e-mail ao clicar em links (Supabase Email OTP).
- **`GET /api/auth/iframe-token`**: Gera um token temporário usado para autorizar módulos em iframes protegidos (usado para injeção da automação legada).

### Endpoints de Usuários (`/api/users/*`)
- **`GET /api/users`**: Lista usuários (Paginação, busca). Protegido, geralmente para Master Admins gerenciando a base.
- **`GET/PATCH/DELETE /api/users/[id]`**: Operações CRUD no perfil do usuário, manipulação de acesso (`acesso_ate`), `plano`, e status (`ativo` ou `bloqueado`).
- **`PATCH /api/users/update`**: Rota para o próprio usuário atualizar dados do seu perfil logado (nome, e-mail).
- **`POST /api/users/upload`**: Rota de upload para avatares.
- **`PATCH /api/users/ai-settings`**: Rota para salvar as configurações globais de comportamento de IA de vendas (Agent SDR).

---

## 3. Módulo WhatsApp (`/api/whatsapp/*`)

Toda a conexão com o WhatsApp do usuário é isolada e usa instâncias dedicadas da Evolution API, gerenciadas transparentemente pela plataforma.

### Gerenciamento de Instância
- **`GET /api/whatsapp/status`**: Busca no Supabase e na Evolution API o status em tempo real da conexão (`connected`, `disconnected` ou `connecting`).
- **`POST /api/whatsapp/connect`**: Solicita a criação e/ou conexão de uma instância. Retorna o QRCode em Base64 gerado pela Evolution API.
- **`POST /api/whatsapp/disconnect`**: Desloga do WhatsApp e deleta/reseta a instância na Evolution API.

### Sincronização & Chat
- **`POST /api/whatsapp/sync`**: Rota de "Sincronização Rápida". Força um fetch na Evolution API para buscar as últimas conversas recentes do número ativo, evitando dessincronização da tela inicial.
- **`POST /api/whatsapp/sync-deep`**: "Sincronização Profunda". Faz a varredura do histórico de mensagens pregressas (limite ajustado via lote) injetando do celular do usuário direto no Supabase. Ideal para contas recém conectadas.
- **`GET /api/whatsapp/chats`**: Retorna todas as conversas agrupadas e ordenadas por ordem de mensagem mais recente. Executado toda vez que o painel CRM é aberto.
- **`GET /api/whatsapp/messages`**: Fetch granular do histórico de uma conversa (usado pelo `ChatWindow.tsx`). Identifica a chave via `remote_jid`.
- **`POST /api/whatsapp/send`**: Rota master de envio de mensagens de texto ou mídia. Converte a payload, faz parsing em JID limpo e aciona o helper `sendTextMessage` da `lib/evolution-api.ts`. Também trata envio paralelo usando `@lid` como fallback para contatos ocultos da Meta.

---

## 4. CRM & Kanban Board (`/api/crm/*`)

Módulo core que mescla Chat e Pipeline de Vendas em uma única interface (inspirada no modelo Trello / Kommo).

- **`GET / POST / PATCH / DELETE /api/crm/columns`**: Manipulação das colunas do Kanban (Lead, Em Atendimento, Fechado, etc.). 
- **`POST / PATCH / DELETE /api/crm/cards`**: Criação de leads dentro das colunas, permitindo mover cards drag-and-drop e rastrear anotações da equipe.
- **`POST /api/crm/ai-toggle`**: Habilita (`ai_active: true`) ou Desabilita o robô de SDR naquele chat específico. Quando desabilitado, o status é alterado para pausado e uma label visual indica que é um humano que está no controle.
- **`POST /api/crm/resolve`**: (Em desenvolvimento final) Fechará a conversa e resetará status para reativar campanhas ou finalizações.

---

## 5. Arquitetura de Webhooks e Fila (Workers)

O recebimento de mensagens tem um design robusto "Industrial" para prevenir quedas de Vercel (Timeouts de rotas Serverless).

- **`POST /api/webhook/evolution`**: Ponto único de entrada para a Evolution API. 
  - **Estratégia Store-and-Forward**: A rota pega o JSON bruto da Evolution e simplesmente dá um `INSERT` na tabela `webhook_logs` do Supabase com estado `processed=false`. 
  - **Fire-and-Forget**: Retorna `HTTP 200 OK` na mesma hora (em < 100ms) para impedir re-tentativas desnecessárias. Em seguida ela faz uma auto-chamada assíncrona não blocante no worker de Cron.
- **`GET /api/cron/process-webhooks`**: O Worker Ativo.
  - Usa bloqueio de concorrência com SQL Nativo (`FOR UPDATE SKIP LOCKED`) na RPC `get_unprocessed_webhooks`.
  - Impede que requisições paralelas processem o mesmo webhook.
  - Lida com parsing complexo da Evolution (Reações, Imagens, Documentos, Textos e Status de Entrega).
  - Atualiza as tabelas `messages`, `contacts` e `whatsapp_instances`.
  - Garante auto-limpeza em webhooks rodando o `cleanup_old_webhook_logs`.

---

## 6. Pagamentos (`/api/payments/*`)

- **`POST /api/payments/create`**: Inicializa uma Preference (Link de Checkout) no Mercado Pago. Criação atrelada ao usuário logado, contendo external_reference.
- **`POST /api/payments/webhook`**: Recebe atualizações IPN (Instant Payment Notification) ou Webhooks do Mercado Pago.
  - Verifica aprovação.
  - Promove o plano do usuário, atualiza a data `acesso_ate` e a `role`.

---

## 7. Bibliotecas Core (Diretório `/lib`)

1. **`evolution-api.ts`**: Faz o Wrapper do Axios / Fetch para a URL mestre do motor Evolution. Facilita envio nativo de `sendTextMessage` injetando instâncias, apikeys e padronização.
2. **`supabase.ts`**: Helper que lida com Service Roles (quando o NextJS age como Administrador ignorando a proteção do banco, como nos Cronjobs) ou Cliente Anon (com JWT do usuário autenticado para respeitar o RLS).

---

## 8. Arquitetura de Banco de Dados (Supabase)

### Principais Tabelas:
1. **`users`**: Base de clientes da SaaS. Contém email, plano e acesso.
2. **`whatsapp_instances`**: Registra cada número gerado. Chave estrangeira ligada ao `user_id`. (Ex: CasalBroker_ID).
3. **`contacts`**: Lista de números/clientes salvos com quem a instância interagiu.
4. **`messages`**: Armazena as trocas textuais e mídias do chat nativo.
   - Habilitada com o `supabase_realtime` e protegida por Restrição (`external_id`, `user_id`) com Upsert contra Duplicação.
5. **`webhook_logs`**: Tabela Fila (Queueing). Armazena as entradas de mensagens cruas em JSON e trackea o estado (processing, processed, failed, retry_count).
6. **`crm_columns` & `crm_cards`**: Relacionais responsáveis pelo arranjo no Kanban Board.

### RLS (Row Level Security):
Praticamente todas as tabelas (messages, contacts, cards) seguem a regra base de segurança:
```sql
CREATE POLICY "Users can only select their own data"
ON table_name FOR SELECT USING (auth.uid() = user_id);
```
O isolamento garante multi-tenant na SaaS.

---

## 9. Front-End / Gerenciamento de Estado (Zustand)

O React client lida com otimização gráfica via bibliotecas.
- **`useChatStore.ts`**: (Localizado em `/store`). Evita que múltiplos componentes no React refaçam polling do banco de dados. 
  - Trabalha com **Atualizações Otimistas** (Optimistic Updates): Quando um envio de WhatsApp é disparado pelo usuário na View, a store pré-aloca a mensagem com ID falso (ex: `opt-123`). 
  - **Reconciliação Assíncrona**: Assim que a API de `/api/whatsapp/send` retorna sucesso com a chave real, a store faz update interno trocando o ID falso pelo UUID real do banco sem piscar a tela, e em seguida aguarda o Supabase Realtime trazer confirmações de check (Ticks "Sent" ou "Read").

## Próximos Passos & Planejamento
- Habilitar anexo de mídias (áudio, imagem e PDF) no chat nativo (Envio).
- Configuração granular de permissões por time/filiais (RBAC complexo).
- Integração da IA (Auto-atendimento com gpt-4) acionada na mudança de Colunas do Kanban.
