# 📚 Documentação de API - SaaS Admin Dashboard

## Endpoints Disponíveis

### Autenticação

#### POST /api/auth/register
Registra um novo usuário

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "senha123",
  "nome": "João Silva"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Erros:**
- `400` - Email já existe
- `400` - Dados inválidos
- `500` - Erro no servidor

---

#### POST /api/auth/login
Faz login de um usuário

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "nome": "João Silva",
    "plano": "free",
    "status": "ativo",
    "email_verified": true,
    "criado_em": "2024-01-01T00:00:00Z",
    "atualizado_em": "2024-01-01T00:00:00Z"
  }
}
```

**Cookies:**
- `sb-access-token` (httpOnly) - Token de acesso
- `sb-refresh-token` (httpOnly) - Token de refresh

**Erros:**
- `401` - Email ou senha incorretos
- `403` - Email não verificado
- `400` - Dados inválidos

---

#### POST /api/auth/logout
Faz logout do usuário

**Request:**
Sem corpo (requer autenticação)

**Response (200):**
```json
{
  "success": true
}
```

**Cookies removidos:**
- `sb-access-token`
- `sb-refresh-token`

---

#### POST /api/auth/verify-email
Verifica o email do usuário

**Request:**
```json
{
  "token": "token_de_verificacao"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "usuario@example.com"
  }
}
```

**Erros:**
- `400` - Token inválido ou expirado
- `400` - Token não fornecido

---

#### GET /api/auth/me
Obtém informações do usuário autenticado

**Request:**
Requer `sb-access-token` no cookie

**Response (200):**
```json
{
  "id": "uuid",
  "email": "usuario@example.com",
  "nome": "João Silva",
  "plano": "admin",
  "status": "ativo",
  "email_verified": true,
  "criado_em": "2024-01-01T00:00:00Z",
  "atualizado_em": "2024-01-01T00:00:00Z"
}
```

**Erros:**
- `401` - Não autenticado
- `404` - Usuário não encontrado

---

### Gerenciamento de Usuários

#### GET /api/users
Lista todos os usuários com paginação

**Requer:** Admin role + Autenticação

**Query Parameters:**
- `page` (default: 1) - Página
- `limit` (default: 10) - Usuários por página
- `search` (opcional) - Buscar por email

**Request:**
```
GET /api/users?page=1&limit=10&search=test@example.com
```

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "usuario@example.com",
      "nome": "João Silva",
      "plano": "pro",
      "status": "ativo",
      "email_verified": true,
      "criado_em": "2024-01-01T00:00:00Z",
      "atualizado_em": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

**Erros:**
- `401` - Não autenticado
- `403` - Sem permissão de admin
- `400` - Parâmetros inválidos

---

#### POST /api/users
Cria um novo usuário manualmente

**Requer:** Admin role + Autenticação

**Request:**
```json
{
  "email": "novo@example.com",
  "password": "senha123",
  "nome": "Novo Usuário",
  "plano": "pro"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "novo@example.com",
    "nome": "Novo Usuário",
    "plano": "pro",
    "status": "ativo",
    "email_verified": true,
    "criado_em": "2024-01-01T00:00:00Z",
    "atualizado_em": "2024-01-01T00:00:00Z"
  }
}
```

**Erros:**
- `400` - Email já existe
- `400` - Dados inválidos
- `401` - Não autenticado
- `403` - Sem permissão de admin

---

#### GET /api/users/[id]
Obtém detalhes de um usuário específico

**Requer:** Admin role + Autenticação

**Request:**
```
GET /api/users/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "usuario@example.com",
  "nome": "João Silva",
  "plano": "pro",
  "status": "ativo",
  "email_verified": true,
  "criado_em": "2024-01-01T00:00:00Z",
  "atualizado_em": "2024-01-01T00:00:00Z"
}
```

**Erros:**
- `404` - Usuário não encontrado
- `401` - Não autenticado
- `403` - Sem permissão de admin

---

#### PATCH /api/users/[id]
Atualiza informações de um usuário

**Requer:** Admin role + Autenticação

**Request:**
```json
{
  "nome": "Novo Nome",
  "plano": "admin",
  "status": "bloqueado"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "usuario@example.com",
  "nome": "Novo Nome",
  "plano": "admin",
  "status": "bloqueado",
  "email_verified": true,
  "criado_em": "2024-01-01T00:00:00Z",
  "atualizado_em": "2024-01-01T00:00:00Z"
}
```

**Erros:**
- `400` - Dados inválidos
- `404` - Usuário não encontrado
- `401` - Não autenticado
- `403` - Sem permissão de admin

---

#### DELETE /api/users/[id]
Deleta um usuário

**Requer:** Admin role + Autenticação

**Request:**
```
DELETE /api/users/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
{
  "success": true
}
```

**Erros:**
- `404` - Usuário não encontrado
- `401` - Não autenticado
- `403` - Sem permissão de admin

---

## Códigos de Erro HTTP

| Código | Significado |
|--------|-------------|
| `200` | OK - Requisição bem-sucedida |
| `201` | Created - Recurso criado |
| `400` | Bad Request - Dados inválidos |
| `401` | Unauthorized - Não autenticado |
| `403` | Forbidden - Sem permissão |
| `404` | Not Found - Recurso não encontrado |
| `500` | Server Error - Erro no servidor |

---

## Headers Obrigatórios

### Para requisições com corpo:
```
Content-Type: application/json
```

### Autenticação:
Automaticamente via `sb-access-token` cookie (httpOnly)

---

## Formatos de Resposta

### Sucesso:
```json
{
  "data": {}
}
```

### Erro:
```json
{
  "error": "Descrição do erro"
}
```

---

## Valores Válidos

### Plano (`plano`)
- `free`
- `pro`
- `admin`

### Status (`status`)
- `ativo`
- `bloqueado`

---

## Exemplos com cURL

### Registrar
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "senha123",
    "nome": "Test User"
  }'
```

### Fazer Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "senha123"
  }' \
  -c cookies.txt
```

### Listar Usuários
```bash
curl -X GET "http://localhost:3000/api/users?page=1&limit=10" \
  -b cookies.txt
```

### Criar Usuário
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "novo@example.com",
    "password": "senha123",
    "nome": "Novo Usuário",
    "plano": "pro"
  }'
```

### Editar Usuário
```bash
curl -X PATCH http://localhost:3000/api/users/uuid \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "nome": "Nome Atualizado",
    "plano": "admin"
  }'
```

### Deletar Usuário
```bash
curl -X DELETE http://localhost:3000/api/users/uuid \
  -b cookies.txt
```

### Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

---

**Última atualização**: 2024
**Versão**: 1.0.0
