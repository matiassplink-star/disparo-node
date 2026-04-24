# 🚀 Guia de Setup - SaaS Admin Dashboard

Siga este guia passo a passo para ter o projeto funcionando localmente.

## ⏱️ Tempo estimado: 15 minutos

## Pré-requisitos

- Node.js 18+ ([Download](https://nodejs.org))
- npm (vem com Node.js)
- Git
- Contas criadas em:
  - [Supabase](https://supabase.com) - banco de dados
  - [Resend](https://resend.com) - envio de emails

## Passo 1: Preparar Supabase

### 1.1 Criar um novo projeto

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New project"
3. Preencha:
   - Organization: crie uma ou selecione
   - Project name: `saas-dashboard`
   - Database password: salve em segurança
   - Region: escolha a mais próxima
4. Clique "Create new project" e aguarde (pode levar alguns minutos)

### 1.2 Copiar credenciais

1. Acesse o projeto criado
2. Vá para Settings > API
3. Copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 1.3 Criar tabelas

1. No Supabase, vá para SQL Editor
2. Copie e execute este código:

```sql
-- Criar tabela users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  plano VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'ativo',
  email_verified BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Criar tabela accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  limite_envios INTEGER DEFAULT 100,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
```

3. Clique em "Run"
4. ✅ Tabelas criadas com sucesso!

### 1.4 Habilitar autenticação por email

1. Vá para Authentication > Providers
2. Procure por "Email"
3. Habilite "Email / Password"
4. Clique "Save"

## Passo 2: Preparar Resend

### 2.1 Obter API Key

1. Acesse [resend.com](https://resend.com)
2. Faça login ou crie conta
3. Vá para API Keys
4. Copie sua chave → `RESEND_API_KEY`

> ℹ️ Em ambiente de teste, qualquer domínio funciona. Em produção, você precisará confirmar seu domínio.

## Passo 3: Instalar Projeto Localmente

### 3.1 Clonar/Navegar até o projeto

```bash
cd saas-admin-dashboard
```

### 3.2 Instalar dependências

```bash
npm install
```

> ⏱️ Isso pode levar 2-3 minutos

### 3.3 Configurar variáveis de ambiente

```bash
# Copiar o arquivo de exemplo
cp .env.example .env.local
```

Abra `.env.local` e preencha com suas credenciais:

```env
# Supabase (copie do passo 1.2)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Resend (copie do passo 2.1)
RESEND_API_KEY=re_xxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Passo 4: Executar o Projeto

```bash
npm run dev
```

Você deve ver:

```
  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local
```

## Passo 5: Primeiro Acesso

### 5.1 Criar usuário admin

1. Acesse [http://localhost:3000](http://localhost:3000)
2. Será redirecionado para `/auth/login`
3. Clique em "Cadastre-se"
4. Preencha:
   - Nome: `Admin`
   - Email: `admin@test.local`
   - Senha: `Senha123!`
   - Confirmar: `Senha123!`
5. Clique "Cadastrar"
6. Você receberá um email de verificação
7. Clique no link de verificação
8. Será redirecionado para login
9. Faça login com suas credenciais

### 5.2 Tornar primeiro usuário um admin

1. Acesse o Supabase Console
2. Vá para Table Editor
3. Selecione tabela `users`
4. Encontre o usuário criado
5. Clique na coluna `plano` e mude de `free` para `admin`
6. Clique em volta ao dashboard e recarregue

## 🎉 Pronto!

Você agora tem um dashboard admin completo funcionando!

### O que você pode fazer:

- ✅ Fazer login/logout
- ✅ Acessar o dashboard
- ✅ Criar novos usuários
- ✅ Editar usuários
- ✅ Deletar usuários
- ✅ Mudar status (ativo/bloqueado)
- ✅ Buscar usuários

## 🆘 Troubleshooting

### Erro: "NEXT_PUBLIC_SUPABASE_URL is required"

**Solução**: Você pulou o Passo 3.3. Verifique se `.env.local` foi criado e tem as variáveis corretas.

### Erro ao fazer login

**Solução**: 

1. Verifique se o email foi verificado
2. Verifique se o usuário tem status `ativo` no Supabase
3. Limpe os cookies do navegador

### Emails não estão sendo enviados

**Solução**:

1. Verifique se a chave Resend está correta
2. Em Resend, adicione `localhost` como domínio autorizado se estiver em teste
3. Verifique o console do servidor para erros

### Comando `npm run dev` não funciona

**Solução**:

```bash
# Limpar node_modules
rm -rf node_modules package-lock.json

# Reinstalar
npm install

# Tentar novamente
npm run dev
```

## 📚 Próximos Passos

1. **Customizar UI**: Edite os componentes em `components/`
2. **Adicionar funcionalidades**: Crie novas rotas em `app/`
3. **Deploy**: Siga as instruções do README.md para fazer deploy no Vercel
4. **Banco de dados**: Adicione mais tabelas conforme sua necessidade

## 💡 Dicas

- Use o VS Code para desenvolvimento (mais rápido)
- Sempre que mudar `.env.local`, reinicie o servidor
- TypeScript ajuda a evitar erros - use tipos!
- TailwindCSS é poderoso - explore a documentação

## 🆘 Problemas não listados?

Verifique:

1. Console do navegador (F12 > Console)
2. Terminal onde `npm run dev` está rodando
3. Supabase Dashboard > Logs
4. Resend Dashboard > Activity

---

**Sucesso! 🚀**

Agora você tem um dashboard admin profissional pronto para produção!
