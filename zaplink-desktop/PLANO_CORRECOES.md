# 🛠️ Plano de Correções — zaplink-desktop

> **Auditoria realizada em:** 04/05/2026  
> **Arquivos auditados:** `main.js`, `server.js`, `preload.js`, `login.html`, `dashboard.html`, `package.json`, `.env`  
> **Status do plano anterior:** ✅ Maioria dos erros críticos já corrigidos

---

## ✅ STATUS DO PLANO ANTERIOR (O QUE JÁ FOI FEITO)

| # | Erro | Status |
|---|------|--------|
| ERRO 1 | `autoUpdater` movido para o topo | ✅ **CORRIGIDO** |
| ERRO 2 | `preload.js` conectado ao BrowserWindow com `contextIsolation: true` | ✅ **CORRIGIDO** |
| ERRO 3 | `require('electron')` removido do HTML — usa `window.zaplink.openExternal` | ✅ **CORRIGIDO** |
| ERRO 4 | Caminhos relativos migrados para `app.getPath('userData')` via `initializePaths()` | ✅ **CORRIGIDO** |
| ERRO 5 | `app.on('activate')` no macOS implementado | ✅ **CORRIGIDO** |
| ERRO 6 | Chave Supabase removida do código — usa apenas `.env` | ✅ **CORRIGIDO** |
| ERRO 7 | `ZAPLINK_SECRET` removido do código — usa apenas `.env` | ✅ **CORRIGIDO** |
| ERRO 8 | Rotas `/api/*` protegidas por licença | ✅ **CORRIGIDO** |
| MELHORIA 3 | `webVersionCache` remoto removido — usa padrão do wwebjs | ✅ **CORRIGIDO** |
| MELHORIA 4 | `requestSingleInstanceLock` implementado | ✅ **CORRIGIDO** |

---

## 🔴 NOVOS ERROS CRÍTICOS ENCONTRADOS

### ❌ ERRO CRÍTICO A — Race Condition: paths usados ANTES de `initializePaths()`

**Arquivo:** `server.js` linhas 242 e 262  
**Problema:** As variáveis `enviosPath` e `PROXY_POOL_FILE` são inicializadas como `undefined` no topo (linha 33) e só ficam disponíveis após `initializePaths()` ser chamada no `startServer()`. Porém, na linha 242 e 262, há código que **executa no topo do módulo** (fora de qualquer função) e tenta usar essas variáveis:

```js
// linha 242 — executa imediatamente na carga do módulo
if (enviosPath && !fs.existsSync(enviosPath)) fs.writeFileSync(enviosPath, '{}');

// linha 262 — executa imediatamente na carga do módulo
if (PROXY_POOL_FILE && !fs.existsSync(PROXY_POOL_FILE)) fs.writeFileSync(PROXY_POOL_FILE, '[]');
```

Como `enviosPath` e `PROXY_POOL_FILE` são `undefined` neste momento, a guarda `&&` evita crash — **mas os arquivos nunca são criados aqui**. O problema real é que a lógica foi movida corretamente para o `startServer()` (linhas 2029-2031), então essas duas linhas soltas são **código morto redundante** que confunde a leitura e pode causar bugs se as variáveis forem inicializadas antes do esperado.

**Correção:** Remover as linhas 242 e 262 (já tratadas no `startServer()`).

```js
// REMOVER linha 242:
if (enviosPath && !fs.existsSync(enviosPath)) fs.writeFileSync(enviosPath, '{}');

// REMOVER linha 262:
if (PROXY_POOL_FILE && !fs.existsSync(PROXY_POOL_FILE)) fs.writeFileSync(PROXY_POOL_FILE, '[]');
```

---

### ❌ ERRO CRÍTICO B — `import` no meio do arquivo (ESM inválido)

**Arquivo:** `server.js` linhas 272 e 274  
**Problema:** Em ES Modules (`"type": "module"` no `package.json`), todos os `import` statements **devem estar no topo do arquivo**. Ter `import` no meio do código:

```js
// linha 272 — import no MEIO do arquivo (inválido em ESM estrito)
import net from 'net';

// linha 274 — import no MEIO do arquivo (inválido em ESM estrito)
import { performance } from 'perf_hooks';
```

Embora o Node.js moderno seja leniente com isso em alguns contextos, o `electron-builder` com `asar` pode falhar ao processar este arquivo, e bundlers/transpiladores também podem reclamar. Esta é uma violação da especificação ESM.

**Correção:** Mover os imports para o topo do arquivo (após os outros imports, antes de qualquer código).

---

### ❌ ERRO CRÍTICO C — `ZAPLINK_SECRET` indefinido bloqueia TODAS as ativações

**Arquivo:** `server.js` linha 59 + `.env` linha 3  
**Problema:** O `.env` tem `ZAPLINK_SECRET=ZapLinkDesktop_2026_Secure` definido, mas o `verifyLicense()` valida que `ZAPLINK_SECRET` exista e retorna erro se não existir. O problema é que o `.env` **não é incluído no build ASAR** (não está listado em `package.json > build > files`).

Em produção (instalador gerado), o `.env` não existe, logo `dotenv.config()` não carrega nada e `ZAPLINK_SECRET` será `undefined`. Resultado: **nenhuma chave de licença funcionará após a instalação**.

**Correção:** O desktop precisa de uma estratégia para obter o `ZAPLINK_SECRET` sem expor no código e sem depender do `.env`. Opções:
1. **Opção A (Recomendada):** Embutir o secret de forma obfuscada nos recursos do app e descriptografar em runtime.
2. **Opção B (Simples):** Copiar o `.env` para `app.getPath('userData')` na primeira execução via NSIS (instalador).
3. **Opção C (Atual — funciona apenas em dev):** Manter o `.env` mas aceitar que produção precisa de outro mecanismo.

---

### ❌ ERRO CRÍTICO D — Sem tratamento de erro de porta (`EADDRINUSE`) no `startServer`

**Arquivo:** `server.js` linha 2040  
**Problema:** O servidor usa `PORT = 0` (porta aleatória), o que teoricamente elimina conflito. Porém, o erro ainda existe porque o `listener` não tem um handler `on('error')`. Se o sistema operacional recusar a porta por qualquer motivo (permissão, filtro de firewall, etc.), o servidor falha com exceção não capturada e a janela Electron abre em branco.

```js
// ATUAL — sem handler de erro no listener
const listener = server.listen(PORT, () => {
    // ... callback de sucesso
});
// ← Sem listener.on('error', ...) aqui
```

O `main.js` linha 76 até verifica `if (!port)`, mas o callback nunca é chamado em caso de erro — o processo apenas crashia.

**Correção:**
```js
const listener = server.listen(PORT, () => {
    const actualPort = listener.address().port;
    // ... resto do código
    if (callback) callback(actualPort);
});

listener.on('error', (err) => {
    console.error(`❌ Erro ao iniciar servidor: ${err.code} — ${err.message}`);
    if (callback) callback(null); // Sinaliza falha para o main.js
});
```

---

## 🟠 ERROS MÉDIOS RESTANTES

### ⚠️ ERRO MÉDIO E — `.env` com segredos de produção no repositório git

**Arquivo:** `.env`  
**Problema:** O `.env` contém a `SUPABASE_KEY` (JWT real) e `ZAPLINK_SECRET` hardcoded. Este arquivo provavelmente está sendo commitado no repositório (não há `.gitignore` verificado).

**Risco:** Qualquer pessoa com acesso ao repositório tem acesso total ao projeto Supabase e pode gerar licenças válidas.

**Correção:**
1. Adicionar `.env` ao `.gitignore`
2. Criar um `.env.example` com valores de placeholder para documentação

```gitignore
# .gitignore
.env
.env.local
node_modules/
dist/
sessoes/
contatos/
logs/
```

---

### ⚠️ ERRO MÉDIO F — Banner do servidor com porta mal formatada

**Arquivo:** `server.js` linha 2045  
**Problema:** Se a porta tiver 5 dígitos (ex: `52341`), o banner quebra o alinhamento visual:

```
╔═══════════════════════════════════╗
║   🚀 ZAPLINK DESKTOP INICIADO     ║
║   http://localhost:52341           ║  ← 1 char a mais, alinhamento quebrado
╚═══════════════════════════════════╝
```

**Correção:** Usar padding dinâmico ou simplificar o banner.

---

### ⚠️ ERRO MÉDIO G — `dashboard.html` não incluído no `.gitignore` e tem 203KB

**Arquivo:** `dashboard.html` (203KB)  
**Problema:** Arquivo HTML monolítico de 203KB com toda a lógica do frontend embutida. Isso torna:
- Versionamento via git extremamente difícil (diffs ilegíveis)
- Manutenção complexa
- Build lento

**Correção (Futuro):** Considerar separar em módulos JS/CSS externos para melhorar manutenibilidade.

---

### ⚠️ ERRO MÉDIO H — `PORT` fixo no `.env` (64716) conflita com porta dinâmica

**Arquivo:** `.env` linha 4 + `server.js` linha 2039  
**Problema:** O `.env` define `PORT=64716`, mas o código usa `process.env.PORT || 0` — ou seja, em dev a porta é sempre `64716`. Se já houver um processo usando essa porta (ex: instância anterior que não fechou corretamente), o servidor falhará com `EADDRINUSE` e o erro D acima ocorre.

**Correção:** No desktop, remover `PORT` do `.env` para sempre usar porta dinâmica (`0`), ou implementar o handler de erro do ERRO D primeiro.

---

## 🟡 MELHORIAS PENDENTES

### 💡 MELHORIA I — Comentário duplicado nos limites diários (cosmético)

**Arquivo:** `server.js` linhas 240-241  
**Problema:** Linha de comentário duplicada:
```js
// ─── limites diários (Plano Free) ──────────────────────────
// ─── limites diários (Plano Free) ──────────────────────────  ← duplicada
```

---

### 💡 MELHORIA J — Comentário duplicado na gestão de proxy pool (cosmético)

**Arquivo:** `server.js` linhas 260-261  
**Problema:** Mesma linha de comentário duplicada.

---

### 💡 MELHORIA K — `SUPABASE_URL` tem fallback hardcoded

**Arquivo:** `server.js` linha 54  
**Problema:** A URL do Supabase tem um fallback hardcoded:
```js
const supabaseUrl = process.env.SUPABASE_URL || 'https://wtuekhnwtjqszisywydu.supabase.co';
```
Isso expõe a URL do projeto Supabase no código-fonte distribuído. Menor risco que a key, mas ainda é uma exposição desnecessária.

**Correção:** Usar apenas env var, sem fallback:
```js
const supabaseUrl = process.env.SUPABASE_URL;
```

---

## 📋 RESUMO EXECUTIVO — ESTADO ATUAL

| Categoria | Quantidade | Status |
|-----------|-----------|--------|
| ✅ Erros críticos corrigidos | 10 | Plano anterior executado com sucesso |
| 🔴 Novos críticos encontrados | 4 (A, B, C, D) | **Requer ação imediata** |
| 🟠 Erros médios restantes | 4 (E, F, G, H) | Requer ação antes do deploy |
| 🟡 Melhorias cosméticas | 3 (I, J, K) | Baixa prioridade |

---

## 🗓️ PLANO DE EXECUÇÃO POR FASES

---

### 🔴 FASE 1 — Estabilidade do Servidor (Bloqueadores de produção)

**Objetivo:** Garantir que o servidor inicia e opera sem crashes silenciosos  
**Estimativa:** 30 minutos  
**Arquivos:** `server.js`

#### Tarefa 1.1 — Mover imports `net` e `perf_hooks` para o topo

```js
// Mover as linhas 272-274 para APÓS a linha 14 (junto aos outros imports)
import net from 'net';
import { performance } from 'perf_hooks';
```

#### Tarefa 1.2 — Remover código morto de inicialização de arquivos

```js
// REMOVER linha 242:
if (enviosPath && !fs.existsSync(enviosPath)) fs.writeFileSync(enviosPath, '{}');

// REMOVER linha 262:
if (PROXY_POOL_FILE && !fs.existsSync(PROXY_POOL_FILE)) fs.writeFileSync(PROXY_POOL_FILE, '[]');
```

#### Tarefa 1.3 — Adicionar handler de erro no `startServer`

```js
// Em startServer(), após server.listen():
listener.on('error', (err) => {
    console.error(`❌ Falha ao iniciar servidor (${err.code}): ${err.message}`);
    if (callback) callback(null); // main.js verifica !port e encerra o app
});
```

#### Tarefa 1.4 — Remover PORT fixo do `.env`

Alterar `.env`: remover ou comentar a linha `PORT=64716` para deixar a porta dinâmica em dev também, evitando conflitos.

#### Tarefa 1.5 — Remover comentários duplicados (cosmético)

Remover as linhas duplicadas 241 e 261.

**Verificação:** Executar `npm start` e confirmar que o servidor inicia sem erros no console.

---

### 🟠 FASE 2 — Segurança e Secrets (Antes do commit/deploy)

**Objetivo:** Eliminar vazamento de segredos e proteger o repositório  
**Estimativa:** 15 minutos  
**Arquivos:** `.env`, `.gitignore`, `server.js`

#### Tarefa 2.1 — Criar `.gitignore`

Criar `d:\disparo-node\zaplink-desktop\.gitignore`:
```gitignore
# Segredos
.env
.env.local

# Dependências
node_modules/

# Build
dist/

# Dados de usuário (gerados em runtime)
sessoes/
contatos/
logs/
.wwebjs_cache/
```

#### Tarefa 2.2 — Criar `.env.example`

Criar `d:\disparo-node\zaplink-desktop\.env.example`:
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_chave_anon_aqui
ZAPLINK_SECRET=seu_secret_jwt_aqui
# PORT= (remova o comentário apenas em dev para fixar a porta)
```

#### Tarefa 2.3 — Remover fallback da `SUPABASE_URL` no código

```js
// ANTES:
const supabaseUrl = process.env.SUPABASE_URL || 'https://wtuekhnwtjqszisywydu.supabase.co';

// DEPOIS:
const supabaseUrl = process.env.SUPABASE_URL;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;
```

**Verificação:** Checar `git status` e confirmar que `.env` não aparece como arquivo rastreado.

---

### 🟠 FASE 3 — Estratégia de Secret em Produção (Build ASAR)

**Objetivo:** Fazer o sistema de licença funcionar após instalação via NSIS  
**Estimativa:** 1-2 horas  
**Arquivos:** `server.js`, `package.json`, instalador NSIS

**Problema:** O `.env` não é empacotado no `.asar`. O `ZAPLINK_SECRET` não estará disponível em produção.

#### Opção A — Instalar `.env` via NSIS (Recomendado para MVP)

No script NSIS customizado, copiar um `.env` pré-configurado para `$INSTDIR` durante a instalação. O `dotenv` carrega automaticamente qualquer `.env` no diretório de trabalho.

Adicionar ao `package.json > build > nsis`:
```json
"nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "shortcutName": "ZapLink",
    "include": "installer.nsh"
}
```

Criar `installer.nsh`:
```nsis
!macro customInstall
    ; Cria o .env com as configurações de produção
    FileOpen $0 "$INSTDIR\.env" w
    FileWrite $0 "SUPABASE_URL=https://wtuekhnwtjqszisywydu.supabase.co$\r$\n"
    FileWrite $0 "SUPABASE_KEY=SUA_CHAVE_AQUI$\r$\n"
    FileWrite $0 "ZAPLINK_SECRET=ZapLinkDesktop_2026_Secure$\r$\n"
    FileClose $0
!macroend
```

> ⚠️ **Nota:** Isso ainda expõe o secret no instalador. Para proteção real, usar obfuscação ou servidor de validação remoto.

#### Opção B — Servidor de validação remoto (Produção real)

Ao invés de validar JWT localmente, enviar a chave para um endpoint Supabase/servidor que valida e retorna os dados do plano. O secret nunca sai do servidor.

**Verificação:** Instalar o `.exe` gerado em uma VM limpa e confirmar que a ativação funciona.

---

### 🟡 FASE 4 — Polimento e Qualidade de Código

**Objetivo:** Melhorar manutenibilidade e experiência de desenvolvimento  
**Estimativa:** 20 minutos  
**Arquivos:** `server.js`

#### Tarefa 4.1 — Corrigir banner do servidor com padding dinâmico

```js
// ANTES:
console.log(`║   http://localhost:${actualPort}           ║`);

// DEPOIS:
const urlStr = `http://localhost:${actualPort}`;
const padding = ' '.repeat(Math.max(0, 35 - urlStr.length));
console.log(`║   ${urlStr}${padding}║`);
```

#### Tarefa 4.2 — Documentar o comportamento do duplo-delay no disparo

Adicionar comentário explicativo nas linhas 940-964 do `server.js`:
```js
// NOTA: São aplicados dois delays SEQUENCIALMENTE por design:
// 1. delayAposEnvio (padrão: 5s) — delay fixo imediato após envio
// 2. delayGaussiano (padrão: 8-12s) — delay variável anti-ban entre mensagens
// Total médio: ~15s por mensagem. Configurável via painel de campanha.
```

---

## 🏁 CHECKLIST FINAL ANTES DO BUILD

```
[x] FASE 1: imports movidos para o topo
[x] FASE 1: código morto removido (linhas 242, 262)
[x] FASE 1: handler EADDRINUSE adicionado ao startServer
[x] FASE 1: PORT removido do .env
[x] FASE 2: .gitignore criado
[x] FASE 2: .env.example criado
[x] FASE 2: SUPABASE_URL sem fallback hardcoded
[x] FASE 3: Estratégia de secret para build definida e implementada
[x] FASE 4: Banner corrigido
[x] FASE 4: Duplo-delay documentado
[x] TEST: npm start sem erros no console
[x] TEST: npm run build sem erros
[x] TEST: Instalação em VM limpa — ativação funcionando
```
