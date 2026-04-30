# Plano de Ação: Agente IA (SDR)

Este plano descreve a implementação do **Agente de Inteligência Artificial** focado em atuar como um SDR (Sales Development Representative) autônomo dentro do ZapLink 2.0.

## 1. Objetivo do Agente IA
O Agente não é apenas um "chatbot de FAQ". Ele terá um comportamento inteligente que lê o histórico recente do cliente e responde utilizando a API da OpenAI (GPT-4o-mini ou GPT-4). O Agente atua automaticamente *apenas* nos chats onde a flag `ai_active` (definida na tabela `contacts` ou `chats`) está ativada.

## 2. Arquitetura de Banco de Dados
Para o usuário SaaS configurar seu robô, precisamos guardar os prompts base. 
Tabela ou colunas na tabela `users`:
- **`ai_prompt`** (text): O prompt de sistema. Ex: "Você é um vendedor da Imobiliária X. Seu objetivo é agendar visitas..."
- **`ai_model`** (text): ex: 'gpt-4o-mini'
- **`ai_temperature`** (float): Nível de criatividade (0.0 a 1.0)
- **`ai_auto_reply_new`** (boolean): Se um novo contato chamar, o robô atende automaticamente?

No chat (`contacts`):
- **`ai_active`** (boolean): Controle individual por conversa.

## 3. Frontend: Painel do Agente (`/dashboard/agente`)
A aba do Agente IA deve conter:
- **Área de Instruções (Prompt)**: Um grande bloco de texto para o usuário ensinar como a IA deve se portar, como contornar objeções e qual é o tom de voz.
- **Opções de Personalidade**: Seletores para o modelo e a temperatura.
- **Área de Teste (Playground)**: Um chat "falso" do lado direito onde o usuário pode conversar com o próprio prompt para testar antes de ligar no WhatsApp real.
- **Botão Liga/Desliga Geral**: Um switch master para pausar a IA na empresa inteira em caso de emergência.

## 4. Backend (Integração Worker & OpenAI)
O coração da IA vai morar na nossa fila de webhooks já existente (`/api/cron/process-webhooks`):
1. **Interceptação**: Quando um webhook chega de um cliente, verificamos: `fromMe == false`.
2. **Verificação de Status**: O contato tem `ai_active = true`? A configuração global da empresa permite IA?
3. **Construção de Contexto (Memory)**:
   - Fazer um SELECT das últimas 10-15 mensagens trocadas naquele `remote_jid` para dar contexto à IA.
4. **Chamada OpenAI**:
   - Injetar o `ai_prompt` como `System Role`.
   - Injetar o histórico como `User` e `Assistant`.
   - Fazer a chamada REST para a OpenAI API.
5. **Ação de Retorno (Disparo)**:
   - Receber a resposta e mandar para a fila de envio da Evolution API.
   - Salvar a mensagem no Supabase como `fromMe: true` e identificar que foi a IA quem enviou.

## 5. Fases de Implementação

- [ ] **Fase 1: Setup do Banco e Configurações**
  - Criar o endpoint `PATCH /api/users/ai-settings` (e garantir a estrutura no banco).
  - Criar a página de configuração (`/dashboard/agente/page.tsx`).
- [ ] **Fase 2: Conexão OpenAI (Backend)**
  - Adicionar a biblioteca `openai` ao projeto (`npm install openai`).
  - Criar a função utilitária `lib/openai.ts`.
- [ ] **Fase 3: O Motor de Resposta (Webhook)**
  - Atualizar o `process-webhooks/route.ts` para acionar a API da OpenAI de forma assíncrona logo após inserir a mensagem recebida no banco de dados.
- [ ] **Fase 4: Handover (Intervenção Humana)**
  - Garantir que o botão "Pausar IA" no CRM funcione, chamando `/api/crm/ai-toggle` e setando `ai_active: false`, fazendo a IA ignorar aquele contato.
