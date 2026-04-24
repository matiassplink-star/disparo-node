# SaaS Admin Dashboard

Sistema completo de dashboard administrativo para gerenciamento de contas de usuários.

## 🚀 Stack Utilizado

- **Frontend**: React 18 + Next.js 14 (App Router)
- **Estilização**: TailwindCSS
- **Backend**: API Routes do Next.js
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Email**: Resend
- **Gerenciamento de Estado**: Zustand
- **Notificações**: React Hot Toast
- **Linguagem**: TypeScript

## 📋 Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn
- Conta no [Supabase](https://supabase.com)
- Conta no [Resend](https://resend.com)

## 🔐 Configuração do Supabase

### 1. Criar Tabela `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  plano VARCHAR(50) NOT NULL DEFAULT 'free', -- free, pro, admin
  status VARCHAR(50) NOT NULL DEFAULT 'ativo', -- ativo, bloqueado
  email_verified BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### 2. Criar Tabela `accounts`

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  limite_envios INTEGER DEFAULT 100,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
```

### 3. Habilitar Autenticação

- Vá para Authentication > Providers
- Habilite "Email" com "Email/Password"
- Configure as confirmações de email

## 📦 Instalação

### 1. Clonar o repositório

```bash
cd saas-admin-dashboard
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env.local
```

Editar `.env.local` com suas credenciais:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_key_aqui

# Resend
RESEND_API_KEY=sua_resend_key_aqui

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Executar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 🔑 Primeiro Usuário Admin

Para criar o primeiro usuário admin, execute no console do Supabase:

```sql
-- 1. Criar usuário no Auth (use o ID gerado e substitua)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('senha123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 2. Copiar o UUID gerado acima e usar como user_id

INSERT INTO users (id, email, nome, plano, status, email_verified)
VALUES (
  'seu-uuid-aqui',
  'admin@example.com',
  'Admin',
  'admin',
  'ativo',
  true
);

INSERT INTO accounts (user_id, limite_envios)
VALUES ('seu-uuid-aqui', 1000);
```

**Ou faça via interface:**

1. Acesse `/auth/register`
2. Crie uma conta
3. Verifique o email
4. No Supabase console, atualize o plano para 'admin'

## 📱 Funcionalidades

### Autenticação
- ✅ Cadastro de usuário
- ✅ Login com email/senha
- ✅ Logout
- ✅ Verificação de email (Resend)
- ✅ Proteção de rotas (middleware)

### Dashboard Admin
- ✅ Listar usuários com paginação
- ✅ Criar novo usuário
- ✅ Editar usuário (nome, plano, status)
- ✅ Deletar usuário
- ✅ Buscar usuário por email
- ✅ Mudar status (ativo/bloqueado)
- ✅ Visualizar detalhes do usuário

### Interface
- ✅ Sidebar com navegação
- ✅ Navbar com dados do usuário
- ✅ Tabela moderno com usuários
- ✅ Modal para criar usuário
- ✅ Formulários validados
- ✅ Loading states
- ✅ Mensagens de erro

## 🏗️ Estrutura de Pastas

```
saas-admin-dashboard/
├── app/
│   ├── (auth)/              # Rotas de autenticação
│   │   ├── login/
│   │   ├── register/
│   │   └── verify-email/
│   ├── (dashboard)/         # Rotas do dashboard (protegidas)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── users/
│   ├── api/                 # API Routes
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── logout/
│   │   │   ├── verify-email/
│   │   │   └── me/
│   │   └── users/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── auth/                # Componentes de autenticação
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── VerifyEmailForm.tsx
│   ├── dashboard/           # Componentes do dashboard
│   │   ├── Sidebar.tsx
│   │   ├── Navbar.tsx
│   │   ├── UserList.tsx
│   │   └── UserForm.tsx
│   └── ui/                  # Componentes UI reutilizáveis
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── lib/
│   ├── supabase.ts         # Cliente Supabase
│   └── resend.ts           # Cliente Resend
├── types/
│   └── index.ts            # Tipos TypeScript
├── middleware.ts           # Middleware de proteção
├── .env.example
├── .env.local
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── README.md
```

## 🔒 Segurança

### ✅ Implementado

- API keys nunca expostas no frontend
- Variáveis de ambiente (.env.local)
- Autenticação via Supabase Auth
- Verificação de email obrigatória
- Middleware de proteção de rotas
- Permissões por plano (admin)
- Cookies HTTP-only para tokens
- Geração de senhas seguras
- Validação de entrada (frontend + backend)

### ⚠️ Recomendações para Produção

- Usar HTTPS em produção
- Aumentar limite de rate-limiting
- Implementar logs e monitoramento
- Fazer backup regularmente
- Revisar políticas de Row-Level Security (RLS) no Supabase
- Usar variáveis de ambiente seguras (secrets manager)
- Implementar 2FA (autenticação de dois fatores)

## 📊 Fluxo de Autenticação

```
1. Usuário acessa /auth/register
2. Preenche formulário (email, senha, nome)
3. Cria conta no Supabase Auth
4. Cria registro na tabela users
5. Resend envia email de verificação
6. Usuário clica link no email
7. Email é marcado como verificado
8. Pode fazer login em /auth/login
9. Token armazenado em cookie HTTP-only
10. Acessa /dashboard com proteção
```

## 🚀 Deploy

### Vercel

```bash
# 1. Push para GitHub
git push

# 2. Conectar no Vercel
vercel

# 3. Adicionar variáveis de ambiente no Vercel Dashboard
# Copie todas as variáveis de .env.local
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## 📝 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm start            # Iniciar servidor de produção
npm run lint         # Verificar código
npm run type-check   # Verificar tipos TypeScript
```

## 🐛 Troubleshooting

### Erro: "Missing Supabase environment variables"
- Verifique se `.env.local` foi criado corretamente
- Reinicie o servidor (`npm run dev`)

### Erro ao enviar email
- Verifique se a chave Resend está correta
- Verifique logs no console do servidor
- Confirme se o domínio está autorizado no Resend

### Erro ao fazer login
- Verifique se o email foi verificado no Supabase
- Confirme se a password está correta
- Verifique se o usuário tem status "ativo"

## 📞 Suporte

Para reportar bugs ou sugerir melhorias, abra uma issue no repositório.

## 📄 Licença

MIT

---

**Criado com ❤️ usando Next.js, Supabase e TailwindCSS**
