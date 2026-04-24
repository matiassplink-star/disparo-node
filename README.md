# 🚀 ZapLink — Automação Profissional para WhatsApp

ZapLink é um ecossistema completo para automação de marketing e vendas via WhatsApp, projetado para escala, estabilidade e segurança. O sistema é composto por um servidor de disparo (Node.js) e um dashboard administrativo SaaS (Next.js).

## 🌟 Principais Funcionalidades

- **Disparos em Massa:** Envio inteligente com simulação de digitação e delays humanos.
- **Rotação Anti-Ban:** Alterne entre múltiplos números automaticamente para proteger seus chips.
- **Extração de Grupos:** Capture leads qualificados de qualquer grupo em segundos.
- **Inteligência Artificial:** Integração com ChatGPT para reescrita de mensagens e respostas humanas.
- **Limpeza de Lista:** Validador de números com verificação de 9º dígito e WhatsApp ativo.
- **Gestor de Proxies:** Suporte a pool de proxies para operações de alta escala.
- **Dashboard SaaS:** Gestão de usuários, planos e métricas em tempo real.

## 🏗️ Arquitetura do Projeto

O repositório está estruturado em duas partes principais:

1.  **Servidor de Disparo (Raiz):** Core em Node.js que gerencia as sessões do WhatsApp via Puppeteer.
2.  **SaaS Admin Dashboard (`/saas-admin-dashboard`):** Painel de controle moderno construído com Next.js 14 e Supabase.

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 18 ou superior
- Git

### Passo 1: Servidor de Disparo
```bash
# Na raiz do projeto
npm install
npm start
```
O servidor rodará em `http://localhost:3001`.

### Passo 2: Dashboard SaaS
```bash
cd saas-admin-dashboard
npm install
npm run dev
```
O painel rodará em `http://localhost:3000`.

## ☁️ Deploy (Produção)

Este projeto está pronto para ser implantado em servidores Linux usando **Docker** e **Coolify**.

- **Dashboard:** Recomendado hospedar na **Vercel**.
- **Backend:** Recomendado VPS com **Coolify** (mínimo 2GB RAM).
- **Banco de Dados:** Utiliza **Supabase**.

Consulte os arquivos `Dockerfile` e `docker-compose.yml` para detalhes da containerização.

## 🔐 Segurança e LGPD
O sistema foi construído respeitando as normas de privacidade, com isolamento de dados por usuário e criptografia de sessões.

---
**Desenvolvido por matiassplink-star**
