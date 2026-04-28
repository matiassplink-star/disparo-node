# ZapLink 2.0 - Plataforma SaaS de Automação e CRM para WhatsApp

Este documento fornece a visão completa, a documentação e o roteiro arquitetural ("prompt completo") de todo o sistema ZapLink 2.0. Ele detalha as Landing Pages (Páginas de Vendas), o Backend de Automação (Node.js) e o Dashboard SaaS (Next.js 14 + Supabase + Evolution API).

---

## 1. Visão Geral do Sistema

O **ZapLink 2.0** é uma plataforma SaaS (Software as a Service) híbrida e de alto desempenho, projetada para gerenciar operações de WhatsApp em larga escala. Ele une o melhor de dois mundos:
1. **Automação em Massa (Disparos):** Utiliza um motor próprio em Node.js com `whatsapp-web.js` (via Puppeteer) para lidar com envios em massa, extração de contatos e adição em grupos, burlando limitações e oferecendo rotação de proxies e chips.
2. **CRM e Atendimento em Tempo Real (Dashboard):** Utiliza um painel Next.js integrado ao **Supabase** (Banco de Dados, Auth, RLS) e à **Evolution API** para gerenciar funis de vendas (Kanban) e chat ao vivo com clientes.

---

## 2. Página de Vendas (Landing Page)

A página de vendas (Landing Page) é a porta de entrada para a aquisição de novos usuários.

### Estrutura e Copywriting
- **Foco de Conversão:** Design moderno, utilizando elementos dinâmicos, paletas de alto contraste e micro-interações (animações suaves).
- **Proposta de Valor:** "Automatize suas vendas, gerencie equipes e multiplique seus resultados no WhatsApp sem bloqueios."
- **Seções Principais:**
  - **Hero Section:** Título impactante (Headline), Sub-headline persuasivo, vídeo de demonstração do SaaS e botão de Call-To-Action (CTA) primário ("Começar Teste Grátis").
  - **Social Proof:** Logos de empresas ou depoimentos de clientes.
  - **Features (Funcionalidades):** Disparos em massa, CRM Integrado, Chat multi-atendente, Rotação de Chips, IA (ChatGPT) e Extrator de Grupos.
  - **Pricing (Planos):** Tabela de preços clara (Plano Free, Recruta Iniciante, Soldado do Disparo, Comandante de Escala, General das Vendas) com seus limites de conexões e disparos diários.
  - **FAQ e Footer:** Perguntas frequentes para quebra de objeções, links para Termos de Uso e Políticas de Privacidade (LGPD compliance).
- **Integração:** O CTA redireciona o usuário para o `/auth/register` do SaaS Dashboard.

---

## 3. Arquitetura do SaaS (Dashboard)

O painel administrativo é construído com tecnologias modernas para garantir escala e estabilidade.

### Tech Stack
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Radix UI (Componentes acessíveis).
- **Backend (API Routes):** Node.js rodando nas rotas server-side do Next.js.
- **Banco de Dados & Auth:** Supabase (PostgreSQL). Utiliza Row Level Security (RLS) para isolar os dados por tenant (`user_id`).
- **Comunicação de WhatsApp Ao Vivo:** Evolution API (gerenciamento de sessões, envio de mensagens individuais e recebimento via Webhooks).
- **Pagamentos:** Integração estruturada (Mercado Pago / Stripe) para upgrade de planos.

### Funcionalidades do Dashboard
1. **CRM Kanban:** Funil de vendas interativo. Permite arrastar contatos por etapas (ex: Lead, Negociação, Fechado, Perdido) e aplicar etiquetas/tags de status.
2. **Chat ao Vivo:** Interface estilo WhatsApp Web. Exibe o histórico de mensagens, permite respostas em tempo real. Os webhooks da Evolution API mantém as mensagens sincronizadas (recebendo e atualizando status `sent`, `delivered`, `read`).
3. **Gerenciamento de Instâncias (Conexões):** Permite ler o QR Code e gerenciar chips conectados via Evolution API para o Chat.
4. **Módulo de Automação (Iframe/API):** Interface que controla o motor de disparos (Node.js backend).
5. **Gerenciamento de Equipe (RBAC):** O usuário "Master" (Dono da Empresa) pode convidar "Membros" da equipe. RLS garante que os membros só vejam os chats atribuídos a eles ou chats gerais da empresa.
6. **Integração com ChatGPT:** Respostas automatizadas usando IA com base no histórico do cliente e prompt configurável pelo usuário.

---

## 4. Backend de Automação (Motor Node.js)

Enquanto a Evolution API gerencia o "um-a-um" no dashboard, este motor isolado e robusto lida com as operações de massa, evitando sobrecarregar a API principal.

### Tech Stack
- Node.js puro com `express` e `ws` (WebSockets).
- `whatsapp-web.js` (Puppeteer base).

### Funcionalidades Core
1. **Disparos em Massa (Bulk Messaging):**
   - Rotação de chips inteligente: distribui as mensagens entre diferentes números conectados para evitar banimentos (ex: a cada 10 mensagens, troca o chip).
   - Pausa Inteligente: delays gaussianos (aleatórios humanos) e pausas longas programáveis (ex: parar 10 minutos a cada 50 envios).
2. **Validação de Números (Limpeza de Lista):** Verifica quais números de uma lista têm WhatsApp ativo antes do envio.
3. **Extração de Contatos:** Puxa membros de grupos e conversas ativas.
4. **Envio e Adição em Grupos:** Ferramentas para adicionar centenas de membros a grupos e enviar mensagens em lote para dezenas de grupos (suporta mídia, áudios e texto).
5. **Gestão de Proxies:** Atribuição de IPs Proxy diferentes para cada chip rodando no Puppeteer.
6. **WebSockets Isolados:** Relatórios de progresso em tempo real enviados ao painel de controle, separados por usuário logado (usando verificação HMAC de tokens).

---

## 5. Fluxos de Dados Críticos

### Fluxo de Recebimento de Mensagem (Webhook Evolution API)
1. Cliente envia mensagem no WhatsApp.
2. Evolution API captura e dispara um Webhook `POST` para `/api/webhook/evolution`.
3. O Dashboard processa o evento `messages.upsert`. Extrai `remoteJid`, `messageText` e verifica se a mensagem possui a chave correta no payload.
4. O Dashboard usa o Supabase `Service Role` para inserir a mensagem no banco de dados (`messages` table) e atualizar o contato (`contacts` table).
5. O Supabase Realtime notifica o frontend do usuário para exibir a nova mensagem imediatamente na aba "Chat".

### Fluxo de Envio de Massa
1. Usuário seleciona contatos e chips no painel, configura atrasos (delays) e clica em enviar.
2. O SaaS envia o comando via API REST para o Backend Node.js.
3. O Node.js inicia um loop assíncrono. Sorteia o número, valida no WhatsApp, simula digitação (Presence "composing") e envia.
4. O status (sucesso/falha) é enviado ao Dashboard via WebSocket para atualizar a barra de progresso visual em tempo real.

---

## 6. Esquema do Banco de Dados Principal (Supabase)

- `users` (Auth): Dados básicos dos usuários logados.
- `companies`: Contas empresariais (para gerenciar equipes).
- `whatsapp_instances`: Sessões da Evolution API (id, nome, status, número).
- `contacts`: Tabela de clientes. Contém o telefone, nome, status no CRM, data da última interação.
- `messages`: Tabela com o histórico de chat. Relacionada à instância e ao contato (content, status, from_me, message_type).
- `team_members`: Relacionamento entre empresas e usuários convidados (Role: admin ou member).

---

## Conclusão do Plano Completo

O **ZapLink 2.0** não é apenas um disparador. É um ecossistema completo de vendas B2B/B2C. Ele resolve a instabilidade do WhatsApp dividindo as responsabilidades: a estabilidade do chat fica com a Evolution API + Next.js, e o "trabalho pesado/arriscado" de envios em massa fica isolado no Puppeteer. O plano completo da plataforma garante conformidade legal, alta escalabilidade técnica e uma UI/UX Premium (foco em retenção e wow-factor).
