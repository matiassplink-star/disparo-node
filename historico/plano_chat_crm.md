# Integração de Chat Interno (WhatsApp) e CRM Kanban

Este documento detalha o plano de ação para implementarmos a nova funcionalidade solicitada: um **Chat Interno** para gerenciar as conversas do WhatsApp diretamente pelo sistema, acoplado a um **CRM em formato Kanban** (colunas de funil de vendas).

## ⚠️ User Review Required

> [!IMPORTANT]
> Por favor, leia o plano abaixo. Precisamos decidir se essa interface do Chat e Kanban será construída **dentro do painel atual (dashboard.html)** ou se faremos uma **Página Nova Moderna no Next.js (`/dashboard/chat`)**.
> 
> **Recomendação técnica:** Fazer no **Next.js**, pois criar um Kanban (com drag-and-drop/arrastar e soltar) é muito melhor e mais fluido usando React moderno. O backend continuará sendo o `server.js`. Você concorda com essa abordagem?

## Objetivos e Escopo

1. **Web WhatsApp Interno:** Ler mensagens recebidas em tempo real e responder diretamente pelo painel.
2. **CRM Kanban:** Transformar os contatos do WhatsApp em "Cards" (Cartões de Negócios) que podem ser arrastados entre colunas (ex: *Novo*, *Atendimento*, *Proposta*, *Fechado*).
3. **Sincronização:** Os chats e o CRM estarão interligados. Clicar em um card abre a conversa da pessoa.

---

## Proposed Changes

### 1. Backend (Servidor de Automação `server.js`)

Precisaremos adicionar ouvintes de eventos para capturar mensagens e rotas para enviá-las:

#### [MODIFY] `server.js`
- **Listener de Mensagens:** Adicionar evento `client.on('message', ...)` para enviar mensagens novas via WebSocket para o frontend.
- **Rotas de Chat:** 
  - `GET /api/chat/:numeroId/:chatId/messages` (buscar histórico)
  - `POST /api/chat/:numeroId/send` (enviar mensagem para o cliente)
- **Persistência do Kanban:** Criar rotas para ler e salvar o estado das colunas e dos cards do Kanban (`/api/crm/kanban`).

---

### 2. Frontend (Painel SaaS Next.js)

Criaremos uma nova tela dedicada para o Atendimento e CRM.

#### [NEW] `saas-admin-dashboard/app/dashboard/crm/page.tsx`
- **Layout Split (Dividido):**
  - **Lado Esquerdo:** Lista de Conversas Recentes.
  - **Centro:** Janela de Chat Aberta (com balões de mensagens e input de texto).
  - **Lado Direito (ou Aba separada):** Visão Kanban (Funil de Vendas).

#### [NEW] Componentes React (`components/crm/`)
- `ChatWindow.tsx`: Interface da conversa com balões.
- `KanbanBoard.tsx`: Quadro arrastável com as colunas (usando biblioteca como `dnd-kit` ou similar).
- `ChatList.tsx`: Lista de usuários do WhatsApp que enviaram mensagens.

---

## Open Questions

> [!WARNING]
> Algumas decisões antes de codar:
> 1. **Armazenamento do Kanban:** Por enquanto, podemos salvar os dados do Kanban em um arquivo `.json` no backend (igual fazemos com as configurações) para ser rápido, ou quer usar um banco de dados real?
> 2. **Multi-Atendentes:** Por enquanto todos que logarem verão as mesmas conversas do número conectado, certo?

## Verification Plan

### Testes Manuais
- Conectar um número no sistema.
- Enviar uma mensagem do seu celular pessoal para o número conectado.
- Verificar se a mensagem aparece imediatamente na tela de "Chat" do painel.
- Responder a mensagem pelo painel e conferir se chega no seu celular pessoal.
- Mover o card do contato da coluna "Novo" para a coluna "Fechado" e atualizar a página para garantir que salvou.
