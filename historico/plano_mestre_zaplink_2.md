# 🚀 ZAPLINK 2.0 — Plano Mestre de Reconstrução

**Data:** 28/04/2026  
**Objetivo:** Reconstruir o ZapLink do zero como plataforma profissional SaaS  
**Princípio:** Implementa → Testa → Próxima Fase. Nunca pular.

---

## Visão Geral da Nova Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend + API)               │
│                                                         │
│  Next.js 14 (saas-admin-dashboard)                      │
│  ├── /dashboard/whatsapp     → Painel de Automação      │
│  ├── /dashboard/chat         → Chat Interno             │
│  ├── /dashboard/crm          → Kanban CRM               │
│  ├── /dashboard/agente       → Construtor SDR Agent     │
│  ├── /api/whatsapp/*         → Proxy para Evolution API  │
│  ├── /api/webhook/evolution  → Recebe mensagens          │
│  ├── /api/agente/*           → Motor do Agente SDR       │
│  └── /api/auth/*             → Auth (Supabase)           │
│                                                         │
│  Supabase JS Client (auth + DB + realtime)              │
└───────────────┬─────────────────────┬───────────────────┘
                │ HTTP/Webhook        │ SQL + Realtime
                ▼                     ▼
┌───────────────────────┐   ┌─────────────────────────────┐
│  EVOLUTION API (VPS)  │   │  SUPABASE (Cloud)           │
│  ─────────────────    │   │  ─────────────────          │
│  • Multi-instâncias   │   │  • PostgreSQL + pgvector    │
│  • QR Code via REST   │   │  • Auth (já em uso)         │
│  • Envio/Recepção     │   │  • Realtime (chat ao vivo)  │
│  • Baileys por baixo  │   │  • Storage (PDFs do RAG)    │
│  • Já está online ✅  │   │  • Row Level Security       │
└───────────────────────┘   └─────────────────────────────┘
```

### O que MORRE:
- ❌ `server.js` (whatsapp-web.js / Puppeteer) → substituído pela Evolution API
- ❌ `dashboard.html` (iframe legado) → substituído por páginas Next.js nativas
- ❌ Coolify para o backend Node → tudo vai pra Vercel
- ❌ Arquivos `.json` como banco de dados → PostgreSQL no Supabase

### O que FICA:
- ✅ `saas-admin-dashboard/` (Next.js 14 na Vercel)
- ✅ Supabase (auth, banco de dados, realtime)
- ✅ Sidebar, Navbar, Layout, Auth — tudo reutilizado
- ✅ Mercado Pago integração de pagamentos
- ✅ Evolution API na VPS (já online)

---

## FASES DE IMPLEMENTAÇÃO

---

### FASE 0 — Preparação do Banco de Dados (Supabase)
**Prioridade:** 🔴 CRÍTICA — tudo depende disso  
**Estimativa:** 1-2 horas  

**O que fazer:**
1. Criar as seguintes tabelas no Supabase:

```sql
-- Instâncias WhatsApp por usuário
CREATE TABLE whatsapp_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'disconnected', -- disconnected | connecting | connected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contatos importados
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  is_valid BOOLEAN DEFAULT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensagens (histórico de chat)
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  remote_jid VARCHAR(50) NOT NULL,
  content TEXT,
  media_url TEXT,
  from_me BOOLEAN DEFAULT FALSE,
  message_type VARCHAR(20) DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM Kanban — Colunas e Cards
CREATE TABLE crm_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  position INT NOT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6'
);

CREATE TABLE crm_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  column_id UUID REFERENCES crm_columns(id) ON DELETE CASCADE,
  contact_phone VARCHAR(20) NOT NULL,
  contact_name VARCHAR(255),
  notes TEXT,
  position INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disparos em massa (log)
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id),
  name VARCHAR(255),
  message_text TEXT,
  media_url TEXT,
  total INT DEFAULT 0,
  sent INT DEFAULT 0,
  failed INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending | running | completed | cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agente SDR (IA)
CREATE TABLE agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id),
  name VARCHAR(100) NOT NULL,
  role VARCHAR(255),
  tone VARCHAR(50) DEFAULT 'amigavel',
  objective TEXT,
  provider VARCHAR(50) DEFAULT 'openai', -- openai | google | anthropic
  model VARCHAR(100) DEFAULT 'gpt-4o',
  api_key_encrypted TEXT,
  business_hours_start TIME DEFAULT '08:00',
  business_hours_end TIME DEFAULT '18:00',
  out_of_hours_message TEXT,
  active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base de conhecimento RAG (vetorial)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  filename VARCHAR(255),
  chunk_text TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- Habilitar Realtime para mensagens (chat ao vivo)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

2. Configurar Row Level Security (RLS) — cada usuário só vê os seus dados.

**Critério de teste:**
- [ ] Todas as tabelas criadas sem erro no Supabase
- [ ] RLS ativado em todas as tabelas
- [ ] Inserir dados de teste manualmente e confirmar que RLS funciona

---

### FASE 1 — Conexão WhatsApp via Evolution API
**Prioridade:** 🔴 CRÍTICA — é o core do produto  
**Estimativa:** 3-4 horas  
**Dependência:** Fase 0 concluída

**Arquivos a criar/modificar:**

#### [NEW] `app/api/whatsapp/connect/route.ts`
- Cria instância na Evolution API (`POST /instance/create`)
- Busca QR Code (`GET /instance/connect/:name`)
- Retorna base64 do QR para o frontend

#### [NEW] `app/api/whatsapp/status/route.ts`
- Consulta status da instância na Evolution API
- Retorna: `disconnected`, `connecting`, `connected`

#### [NEW] `app/api/whatsapp/disconnect/route.ts`
- Desconecta a instância (`DELETE /instance/logout/:name`)

#### [NEW] `app/api/webhook/evolution/route.ts`
- Recebe TODOS os webhooks da Evolution API
- Processa eventos: `messages.upsert`, `connection.update`, `qrcode.updated`
- Salva mensagens no Supabase
- Atualiza status de conexão no banco

#### [MODIFY] `app/dashboard/whatsapp/page.tsx`
- **REMOVER** toda a lógica de iframe
- Construir UI nativa com:
  - Botão "Conectar WhatsApp" → exibe QR Code
  - Status de conexão (bolinha verde/vermelha)
  - Info do número conectado

#### [NEW] `lib/evolution-api.ts`
- Classe utilitária para chamadas à Evolution API
- Centraliza URL base, API Key, headers

**Critério de teste:**
- [ ] Clicar "Conectar WhatsApp" exibe QR Code na tela
- [ ] Escanear o QR com o celular conecta com sucesso
- [ ] Status muda para "Conectado" automaticamente
- [ ] Desconectar funciona
- [ ] Reconectar funciona (sem criar instância duplicada)

---

### FASE 2 — Chat Interno (Receber e Enviar Mensagens)
**Prioridade:** 🟡 ALTA  
**Estimativa:** 4-5 horas  
**Dependência:** Fase 1 concluída

**Arquivos a criar/modificar:**

#### [NEW] `app/api/whatsapp/send/route.ts`
- Envia mensagem de texto via Evolution API (`POST /message/sendText/:instance`)
- Envia mídia via Evolution API (`POST /message/sendMedia/:instance`)

#### [NEW] `app/api/whatsapp/chats/route.ts`
- Lista todas as conversas do usuário (agrupadas por `remote_jid`)
- Retorna: nome do contato, última mensagem, horário, contagem de não lidas

#### [NEW] `app/dashboard/chat/page.tsx`
- Layout de chat moderno (estilo WhatsApp Web)
- Lado esquerdo: lista de conversas
- Centro: janela de chat com balões de mensagens
- Input de texto + botão de enviar + anexar mídia

#### [NEW] `components/chat/ChatList.tsx`
- Lista de conversas com avatar, nome, última mensagem, hora
- Busca filtrada por nome/número

#### [NEW] `components/chat/ChatWindow.tsx`
- Balões de mensagens (enviadas vs recebidas)
- Scroll automático para a última mensagem
- Indicador de "digitando..."

#### [NEW] `components/chat/MessageInput.tsx`
- Input com suporte a Enter para enviar
- Botão de anexar mídia (imagem, PDF)
- Botão de enviar

**Realtime:** Usar `supabase.channel('messages').on('postgres_changes', ...)` para receber mensagens novas em tempo real sem WebSocket manual.

**Critério de teste:**
- [ ] Enviar mensagem de um celular externo → aparece no chat do painel
- [ ] Responder pelo painel → chega no celular externo
- [ ] Mensagens aparecem em tempo real (sem recarregar a página)
- [ ] Histórico persiste ao recarregar
- [ ] Enviar imagem funciona

---

### FASE 3 — Disparo em Massa + Limpeza de Lista
**Prioridade:** 🟡 ALTA  
**Estimativa:** 4-5 horas  
**Dependência:** Fase 1 concluída

**Arquivos a criar/modificar:**

#### [NEW] `app/api/whatsapp/campaign/route.ts`
- Recebe lista de números + mensagem + mídia
- Valida números via Evolution API (`POST /chat/whatsappNumbers/:instance`)
- Executa disparo com delay anti-ban (2-5 segundos entre envios)
- Reporta progresso via polling ou Supabase Realtime

#### [NEW] `app/api/whatsapp/clean/route.ts`
- Recebe lista de números
- Verifica quais existem no WhatsApp via Evolution API
- Retorna: válidos, inválidos, erros

#### [NEW] `app/dashboard/whatsapp/disparo/page.tsx`
- UI para upload/colar lista de números
- Campo de mensagem com preview
- Barra de progresso em tempo real (enviados/total/falhas)

#### [NEW] `app/dashboard/whatsapp/limpeza/page.tsx`
- Upload de lista → validação → download de lista limpa

**Critério de teste:**
- [ ] Upload de 10 números → limpeza retorna válidos/inválidos corretamente
- [ ] Disparo de 5 mensagens → todas chegam nos celulares alvo
- [ ] Barra de progresso atualiza em tempo real
- [ ] Cancelar disparo funciona

---

### FASE 4 — CRM Kanban
**Prioridade:** 🟢 MÉDIA  
**Estimativa:** 3-4 horas  
**Dependência:** Fase 2 concluída (Chat)

**Arquivos a criar/modificar:**

#### [NEW] `app/dashboard/crm/page.tsx`
- Quadro Kanban com colunas arrastáveis
- Colunas padrão: Novo Lead | Em Atendimento | Proposta | Fechado
- Cards representam contatos com nome, número, última mensagem

#### [NEW] `components/crm/KanbanBoard.tsx`
- Implementação com `@dnd-kit/core` para drag-and-drop
- Colunas customizáveis (adicionar, renomear, reordenar)

#### [NEW] `components/crm/KanbanCard.tsx`
- Card do lead com: avatar, nome, número, tags
- Clicar abre o chat da pessoa (integração com Fase 2)

#### [NEW] `app/api/crm/route.ts`
- CRUD de colunas e cards
- Mover card entre colunas (atualizar `column_id` e `position`)

**Critério de teste:**
- [ ] Colunas padrão aparecem ao abrir a página pela primeira vez
- [ ] Arrastar card de uma coluna para outra salva a mudança
- [ ] Recarregar a página mantém a posição dos cards
- [ ] Clicar no card abre o chat do contato

---

### FASE 5 — Agente SDR com IA + RAG
**Prioridade:** 🟢 MÉDIA  
**Estimativa:** 6-8 horas  
**Dependência:** Fase 2 concluída (Chat + Webhook)

**Arquivos a criar/modificar:**

#### [NEW] `app/dashboard/agente/page.tsx`
- Interface de configuração do agente (4 seções):
  1. Identidade (nome, papel, tom, objetivo)
  2. Modelo de IA (provedor, modelo, API key)
  3. Base de conhecimento (upload PDF, colar texto, URL)
  4. Regras (horário, fora do horário, limite mensagens)

#### [NEW] `app/api/agente/config/route.ts`
- CRUD da configuração do agente
- Criptografar API Key antes de salvar

#### [NEW] `app/api/agente/knowledge/route.ts`
- Upload de PDF → extração de texto → chunking → embedding → pgvector
- Listar documentos indexados
- Deletar documento

#### [NEW] `lib/ai-engine.ts`
- Abstração multi-provedor (OpenAI, Gemini, Claude)
- Função `chamarIA(provedor, modelo, apiKey, messages)` universal

#### [NEW] `lib/rag-engine.ts`
- Função `indexarDocumento(userId, agentId, buffer, filename)`
- Função `buscarContexto(userId, agentId, pergunta)`
- Usa pgvector para busca por similaridade

#### [MODIFY] `app/api/webhook/evolution/route.ts`
- Ao receber mensagem: verificar se o agente SDR está ativo
- Se ativo: buscar contexto RAG → montar prompt → chamar IA → enviar resposta
- Se inativo: apenas salvar no banco (chat manual)

**Novas dependências npm:**
```
openai @google/generative-ai @anthropic-ai/sdk
langchain pdf-parse
```

**Critério de teste:**
- [ ] Configurar agente com nome "Sofia", tom "amigável", provedor "OpenAI"
- [ ] Upload de PDF → chunks aparecem como "indexados"
- [ ] Ativar agente → enviar mensagem do celular → agente responde automaticamente
- [ ] Resposta do agente usa informações do PDF (RAG funciona)
- [ ] Fora do horário → mensagem customizada é enviada
- [ ] Desativar agente → mensagens voltam a ser apenas salvas no chat

---

### FASE 6 — Migração da Sidebar + Limpeza Final
**Prioridade:** 🔵 POLIMENTO  
**Estimativa:** 2 horas  
**Dependência:** Fases 1-5 concluídas

**O que fazer:**

#### [MODIFY] `components/dashboard/Sidebar.tsx`
- Atualizar menu com as novas rotas nativas:
  - Dashboard → `/dashboard`
  - WhatsApp → `/dashboard/whatsapp` (QR + Status)
  - Chat → `/dashboard/chat`
  - Disparo → `/dashboard/whatsapp/disparo`
  - Limpeza → `/dashboard/whatsapp/limpeza`
  - CRM → `/dashboard/crm`
  - Agente IA → `/dashboard/agente`
  - Tutoriais → `/dashboard/tutoriais`

#### [DELETE] Arquivos mortos:
- `dashboard.html` (o iframe legado)
- `server.js` (substituído pela Evolution API)
- `docker-compose.yml` (não mais necessário)
- `Dockerfile` (não mais necessário)
- `server.js.backup`

**Critério de teste:**
- [ ] Todas as rotas do menu abrem sem erro
- [ ] Build da Vercel passa sem warnings
- [ ] Site acessível em `zaplink.casalbrokersistema.online`

---

## VARIÁVEIS DE AMBIENTE (Vercel)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Evolution API
EVOLUTION_API_URL=http://api.casalbrokersistema.online
EVOLUTION_API_KEY=sua-chave-secreta

# Mercado Pago (já existe)
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-...
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...

# Webhook URL (para configurar na Evolution API)
# https://zaplink.casalbrokersistema.online/api/webhook/evolution
```

---

## CRONOGRAMA RESUMIDO

| Fase | Nome | Depende de | Estimativa |
|------|------|------------|-----------|
| 0 | Banco de Dados (Supabase) | — | 1-2h |
| 1 | Conexão WhatsApp (Evolution API) | Fase 0 | 3-4h |
| 2 | Chat Interno | Fase 1 | 4-5h |
| 3 | Disparo + Limpeza | Fase 1 | 4-5h |
| 4 | CRM Kanban | Fase 2 | 3-4h |
| 5 | Agente SDR + RAG | Fase 2 | 6-8h |
| 6 | Migração Sidebar + Limpeza | Fase 1-5 | 2h |
| **TOTAL** | | | **23-30h** |

---

## REGRAS DE OURO

1. **Nunca pular fase.** Cada fase tem critérios de teste. Só avança quando todos passam.
2. **Cada fase gera um commit.** Sempre testável e deployável.
3. **Sem gambiarra.** Se precisa de banco, usa banco. Se precisa de fila, usa fila.
4. **Documentar tudo na pasta `historico/`.** Cada fase gera um relatório.
5. **Evolution API é a camada WhatsApp.** Nunca tocar no protocolo direto.
