# 🔒 Guia de Segurança - SaaS Admin Dashboard

## Práticas de Segurança Implementadas

### 1. Autenticação Segura
- ✅ Senhas criptografadas com bcrypt
- ✅ Tokens JWT com expiração
- ✅ Cookies HTTP-only (não acessível via JavaScript)
- ✅ Verificação de email obrigatória
- ✅ Proteção contra força bruta (implementar rate limiting)

### 2. Proteção de Rotas
- ✅ Middleware de autenticação
- ✅ Verificação de permissões (admin)
- ✅ Redirecionamento automático para login
- ✅ Redirecionamento automático do não-admin

### 3. Segurança de API
- ✅ Validação de entrada
- ✅ Verificação de autenticação em cada rota
- ✅ Verificação de permissões
- ✅ Tratamento de erros seguro
- ⚠️ Rate limiting (não implementado - IMPORTANTE para produção)

### 4. Variáveis de Ambiente
- ✅ Nunca compita em repositório
- ✅ Apenas admin keys no backend
- ✅ Chaves públicas para frontend (prefixadas com NEXT_PUBLIC_)
- ✅ Arquivo .env.example para referência

### 5. Banco de Dados (Supabase)
- ✅ Row-Level Security (RLS) deve ser configurado
- ✅ Índices para performance
- ✅ Relacionamento com cascade delete
- ✅ Validação de tipo no schema

## ⚠️ Recomendações para Produção

### 1. Rate Limiting
Implemente rate limiting em `/api/auth/*`:

```typescript
// Exemplo com Upstash
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
});

// Na rota:
const { success } = await ratelimit.limit(email);
if (!success) return { error: "Muitas tentativas" };
```

### 2. Logging e Monitoramento
Adicione logs de segurança:

```typescript
// lib/logger.ts
export function logSecurityEvent(type: string, data: any) {
  console.log(`[SECURITY] ${type}`, {
    timestamp: new Date().toISOString(),
    ...data,
  })
  // Integrar com Sentry, DataDog, etc.
}
```

### 3. Row-Level Security (RLS) no Supabase

```sql
-- Políticas RLS para tabela users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Admin pode ver todos os usuários
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.plano = 'admin'
    )
  );

-- Usuários podem ver apenas sua própria conta
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Apenas admin pode atualizar
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.plano = 'admin'
    )
  );
```

### 4. HTTPS em Produção
- Configurar SSL/TLS
- Usar `secure: true` em cookies
- Redirecionar HTTP → HTTPS

### 5. CORS Seguro
```typescript
// next.config.js
const nextConfig = {
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        {
          key: "Access-Control-Allow-Origin",
          value: process.env.ALLOWED_ORIGINS || "http://localhost:3000",
        },
      ],
    },
  ],
};
```

### 6. Content Security Policy (CSP)
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  
  return response;
}
```

### 7. Autenticação de Dois Fatores (2FA)
Implemente com Supabase Auth:

```typescript
//  Habilitar em Authentication > Providers > MFA
```

### 8. Auditoria de Mudanças
Crie tabela de logs:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50),
  target_user_id UUID REFERENCES users(id),
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔍 Checklist de Segurança

- [ ] Rate limiting implementado
- [ ] RLS policies configuradas
- [ ] HTTPS habilitado
- [ ] CORS restringido
- [ ] CSP headers adicionados
- [ ] Logging de segurança ativo
- [ ] 2FA habilitado
- [ ] Senhas se expiram após X dias
- [ ] Auditoria de mudanças funcionando
- [ ] Backup automático do banco
- [ ] Monitoramento de anomalias
- [ ] Testes de segurança realizados
- [ ] Dependências atualizadas
- [ ] Secrets nunca em logs/repositório

## 🚨 Indicadores de Comprometimento

Se suspeitar de segurança comprometida:

1. **Imediatamente:**
   - Copiar as chaves (novo service role key no Supabase)
   - Revogar tokens ativos
   - Resetar senhas

2. **Análise:**
   - Revisar logs de acesso
   - Verificar mudanças suspeitas
   - Auditar permissões

3. **Comunicação:**
   - Notificar usuários afetados
   - Informar stakeholders
   - Documentar o incidente

## 📚 Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)

---

**Última atualização**: 2024
**Versão**: 1.0.0
