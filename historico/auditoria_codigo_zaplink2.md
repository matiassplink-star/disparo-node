# Auditoria: O Que Fica vs O Que Morre no ZapLink 2.0

**Data:** 28/04/2026

---

## ✅ O QUE FICA (100% Reaproveitado — Não Mexemos)

Estes arquivos e componentes continuam funcionando exatamente como estão.

### Infraestrutura & Config
| Arquivo | O que faz | Veredicto |
|---------|-----------|-----------|
| `lib/supabase.ts` | Clientes Supabase (server + client, lazy init) | ✅ Perfeito, reutiliza direto |
| `lib/resend.ts` | Envio de emails (Resend) | ✅ Mantém |
| `middleware.ts` | Proteção de rotas (cookie `sb-access-token`) | ✅ Mantém |
| `next.config.js` | Config do Next.js | ✅ Mantém |
| `tailwind.config.js` | Config do Tailwind | ✅ Mantém |
| `tsconfig.json` | Config TypeScript | ✅ Mantém |
| `package.json` | Dependências base | ✅ Mantém (só adicionamos novas) |
| `types/index.ts` | Types `User`, `Account`, `AuthSession` | ✅ Mantém (vamos expandir) |

### Autenticação (100% pronta)
| Arquivo | O que faz | Veredicto |
|---------|-----------|-----------|
| `app/api/auth/login/route.ts` | Login com Supabase | ✅ Mantém |
| `app/api/auth/register/route.ts` | Cadastro com Supabase | ✅ Mantém |
| `app/api/auth/logout/route.ts` | Logout (limpa cookie) | ✅ Mantém |
| `app/api/auth/me/route.ts` | Retorna dados do user logado | ✅ Mantém |
| `app/api/auth/verify-email/route.ts` | Verificação de email | ✅ Mantém |
| `app/auth/login/page.tsx` | Tela de login | ✅ Mantém |
| `app/auth/register/page.tsx` | Tela de cadastro | ✅ Mantém |
| `app/auth/verify-email/page.tsx` | Tela de verificação de email | ✅ Mantém |
| `components/auth/LoginForm.tsx` | Formulário de login | ✅ Mantém |
| `components/auth/RegisterForm.tsx` | Formulário de registro | ✅ Mantém |
| `components/auth/VerifyEmailForm.tsx` | Formulário de verificação | ✅ Mantém |

### Layout & Design System
| Arquivo | O que faz | Veredicto |
|---------|-----------|-----------|
| `app/layout.tsx` | Layout raiz (meta, fonts, etc) | ✅ Mantém |
| `app/globals.css` | CSS global + tema dark | ✅ Mantém |
| `app/dashboard/layout.tsx` | Layout do dashboard (Sidebar + Navbar + Aurora) | ✅ Mantém |
| `components/dashboard/Navbar.tsx` | Barra superior | ✅ Mantém |
| `components/dashboard/Sidebar.tsx` | Menu lateral | ✅ Mantém (modificar itens do menu) |
| `components/ui/Button.tsx` | Componente botão reutilizável | ✅ Mantém |
| `components/ui/Input.tsx` | Componente input reutilizável | ✅ Mantém |
| `components/ui/Modal.tsx` | Componente modal reutilizável | ✅ Mantém |
| `components/atualizacao/ThemeProvider.tsx` | Provider de tema dark/light | ✅ Mantém |
| `components/atualizacao/ThemeSwitcher.tsx` | Botão para trocar tema | ✅ Mantém |
| `components/atualizacao/LanguageContext.tsx` | Provider de idioma (PT/EN/ES) | ✅ Mantém |
| `components/atualizacao/LanguageSwitcher.tsx` | Botão para trocar idioma | ✅ Mantém |

### Páginas do Dashboard
| Arquivo | O que faz | Veredicto |
|---------|-----------|-----------|
| `app/dashboard/page.tsx` | Dashboard principal (boas vindas, stats) | ✅ Mantém |
| `app/dashboard/perfil/` | Página de perfil do usuário | ✅ Mantém |
| `app/dashboard/settings/` | Configurações | ✅ Mantém |
| `app/dashboard/tutoriais/` | Página de tutoriais | ✅ Mantém |
| `app/dashboard/users/` | Gerenciamento de usuários (admin) | ✅ Mantém |
| `components/dashboard/UserForm.tsx` | Formulário de edição de user | ✅ Mantém |
| `components/dashboard/UserList.tsx` | Listagem de users (admin) | ✅ Mantém |

### Pagamentos
| Arquivo | O que faz | Veredicto |
|---------|-----------|-----------|
| `app/api/payments/webhook/route.ts` | Webhook do Mercado Pago | ✅ Mantém |

### SEO & Público
| Arquivo | O que faz | Veredicto |
|---------|-----------|-----------|
| `app/page.tsx` | Landing page | ✅ Mantém |
| `app/sitemap.ts` | Sitemap XML | ✅ Mantém |
| `app/robots.ts` | Robots.txt | ✅ Mantém |
| `app/privacy/` | Política de Privacidade | ✅ Mantém |
| `app/terms/` | Termos de Uso | ✅ Mantém |

---

## ⚠️ O QUE MODIFICA (Mantém a base, altera lógica)

| Arquivo | O que muda | Por quê |
|---------|------------|---------|
| `components/dashboard/Sidebar.tsx` | Atualizar itens do menu | Adicionar Chat, CRM, Agente IA. Remover referências ao iframe |
| `app/dashboard/whatsapp/page.tsx` | **Reescrever completamente** | Hoje usa iframe do `server.js`. Vai virar UI nativa que chama Evolution API |
| `app/dashboard/layout.tsx` | Adicionar novas rotas à lista de permitidas | `rotasPermitidas` precisa incluir `/dashboard/chat`, `/dashboard/crm`, `/dashboard/agente` |
| `types/index.ts` | Expandir com novos types | `WhatsAppInstance`, `Message`, `CrmCard`, `Agent`, etc |

---

## ❌ O QUE MORRE (Deletar ou Arquivar)

Estes arquivos ficam obsoletos porque a Evolution API substitui 100% do que eles faziam.

| Arquivo | O que fazia | Por que morre |
|---------|-------------|---------------|
| `server.js` | Backend WhatsApp (Puppeteer, Chromium, 1700+ linhas) | Evolution API faz tudo via HTTP |
| `server.js.backup` | Backup antigo | Desnecessário |
| `dashboard.html` | Painel legado (iframe) | Substituído por páginas Next.js nativas |
| `Dockerfile` | Container Docker para o server.js | Não precisa mais, Vercel faz deploy |
| `docker-compose.yml` | Orquestração do Docker | Não precisa mais |
| `.dockerignore` | Config do Docker | Não precisa mais |
| `package.json` (raiz) | Deps do server.js (whatsapp-web.js, etc) | O package.json do Next.js é o principal agora |
| `package-lock.json` (raiz) | Lock file da raiz | Idem |
| `app/api/auth/iframe-token/` | Gerava token JWT para o iframe | Não existe mais iframe |
| Pasta `sessoes/` | Salvava sessões do Chromium | Evolution API gerencia sessões sozinha |
| Pasta `contatos/` | Salvava contatos em .json | Agora salva no Supabase (tabela `contacts`) |
| Pasta `midia/` | Salvava mídias localmente | Agora salva no Supabase Storage |
| Pasta `logs/` | Logs e metadados em .json | Agora tudo no banco PostgreSQL |
| Pasta `whatsapp_session/` | Sessão antiga do wwebjs | Morta |

---

## 🆕 O QUE É NOVO (Criar do Zero)

| Arquivo | O que faz |
|---------|-----------|
| `lib/evolution-api.ts` | Classe utilitária para chamar a Evolution API |
| `lib/ai-engine.ts` | Abstração multi-LLM (OpenAI, Gemini, Claude) |
| `lib/rag-engine.ts` | Motor de RAG (chunking, embedding, busca vetorial) |
| `app/api/whatsapp/connect/route.ts` | Criar instância + QR Code |
| `app/api/whatsapp/status/route.ts` | Status de conexão |
| `app/api/whatsapp/disconnect/route.ts` | Desconectar número |
| `app/api/whatsapp/send/route.ts` | Enviar mensagem |
| `app/api/whatsapp/chats/route.ts` | Listar conversas |
| `app/api/whatsapp/campaign/route.ts` | Disparo em massa |
| `app/api/whatsapp/clean/route.ts` | Limpeza de lista |
| `app/api/webhook/evolution/route.ts` | Recebe webhooks da Evolution |
| `app/api/crm/route.ts` | CRUD do Kanban |
| `app/api/agente/config/route.ts` | CRUD do agente SDR |
| `app/api/agente/knowledge/route.ts` | Upload/Indexação RAG |
| `app/dashboard/chat/page.tsx` | Página de Chat Interno |
| `app/dashboard/crm/page.tsx` | Página do CRM Kanban |
| `app/dashboard/agente/page.tsx` | Página do Construtor de Agente |
| `app/dashboard/whatsapp/disparo/page.tsx` | Página de disparo em massa |
| `app/dashboard/whatsapp/limpeza/page.tsx` | Página de limpeza de lista |
| `components/chat/ChatList.tsx` | Lista de conversas |
| `components/chat/ChatWindow.tsx` | Janela de conversa |
| `components/chat/MessageInput.tsx` | Input de mensagem |
| `components/crm/KanbanBoard.tsx` | Quadro Kanban |
| `components/crm/KanbanCard.tsx` | Card do lead |

---

## RESUMO NUMÉRICO

| Categoria | Quantidade |
|-----------|-----------|
| ✅ Arquivos que FICAM intactos | **~35 arquivos** |
| ⚠️ Arquivos que MODIFICAM | **4 arquivos** |
| ❌ Arquivos que MORREM | **~12 arquivos/pastas** |
| 🆕 Arquivos NOVOS a criar | **~24 arquivos** |

**Conclusão:** Aproximadamente **60% do projeto atual é reaproveitado.** Toda a camada de autenticação, layout, design system, pagamentos, landing page e SEO continua 100% funcional. O que muda é a "camada WhatsApp" que sai do `server.js` (Puppeteer) e vai para chamadas HTTP à Evolution API.
