# 🔍 Auditoria Completa — Módulos de Operação (ZapLink Desktop)

> **Data:** 04/05/2026  
> **Módulos auditados:** Disparo, Extrator, Limpeza de Lista, Envio a Grupos, Add a Grupos, Assinatura  
> **Arquivos:** `server.js`, `dashboard.html`

---

## 📊 RESUMO GERAL

| Módulo | Status | Bugs Críticos | Bugs Médios | Melhorias |
|--------|--------|--------------|------------|-----------|
| Disparo | ✅ Funcional | 0 | 2 | 2 |
| Extrator | ⚠️ Parcial | 1 | 1 | 1 |
| Limpeza de Lista | ✅ Funcional | 0 | 1 | 2 |
| Envio a Grupos | ⚠️ Parcial | 1 | 2 | 1 |
| Add a Grupos | ⚠️ Parcial | 1 | 1 | 1 |
| Assinatura | ✅ Atualizado | — | — | ✅ Feito |

---

## 🚀 MÓDULO 1 — DISPARO

### 🩺 Diagnóstico
Sistema de disparo bem implementado com: loop assíncrono, delay duplo (fixo + gaussiano), rotação de números, pausa automática, suporte a mídia e integração com GPT. Arquitetura sólida.

### 🟠 BUG 1 — Delay mínimo e máximo interpretados como ms mas label diz "segundos"

**Dashboard.html linhas 897-908 vs server.js**

O input no painel chama o campo:
```
DELAY APÓS ENVIO (segundos)   → input #dispDelayEnvio value="5"
MÍNIMO (ms)                   → input #dispDelayMin value="8000"
MÁXIMO (ms)                   → input #dispDelayMax value="15000"
```

O primeiro campo diz **"segundos"** mas é enviado diretamente ao server. O servidor usa assim:
```js
// server.js linha 939:
await new Promise(r => setTimeout(r, cfg.delayAposEnvio || 5000));
```
`cfg.delayAposEnvio` recebe o valor do input `dispDelayEnvio` que o usuário inseriu como **5** (segundos). O `setTimeout` aguarda **5ms** em vez de **5000ms**.

**Correção necessária em `iniciarDisparo()` no dashboard:**
```js
delayAposEnvio: (parseInt(document.getElementById('dispDelayEnvio').value) || 5) * 1000, // ← converter p/ ms
```

### 🟠 BUG 2 — Ao pausar, o disparo continua enviando a mensagem atual

**server.js linhas 780-821**

O check de pausa é feito no **início** do loop (`if (d.status === 'pausado')`), após cada envio. Porém se o disparo estiver no meio de `sendMessage()` (que pode levar vários segundos), a pausa só é aplicada na **próxima iteração**. Não é um bug grave, mas o usuário pode estranhar que o sistema envia mais uma mensagem após clicar em "Pausar".

**Melhoria:** Documentar esse comportamento no tooltip do botão "Pausar".

### 🟡 MELHORIA 1 — Sem indicador visual de qual número está sendo usado no momento

O painel de disparo mostra progresso geral, mas não exibe qual número está disparando no momento atual. Adicionando o `numeroUsado` ao broadcast de `disparos` e exibindo na UI.

### 🟡 MELHORIA 2 — Input de delay não tem validação min/max

Um usuário pode inserir `0` ou `-1` no delay, causando spam descontrolado. Adicionar `min="1"` e validação no `iniciarDisparo()`.

---

## 🔎 MÓDULO 2 — EXTRATOR

### 🩺 Diagnóstico
Extrator tem 3 modos: Grupos, Agenda e Conversas. O código do servidor para extração de membros de grupo usa `getChats()` + `participants`, e há uma rota separada `/api/extracao/conversas/:numeroId`. A UI tem botões e resultado com exportação CSV.

### 🔴 CRÍTICO — `extrairConversas()` chama a rota ERRADA no frontend

**dashboard.html (procurar `extrairConversas`)**

A aba do extrator tem o botão "💬 Conversas" chamando `extrairConversas()`. Essa função precisa verificar qual rota chama. A rota de extração de conversas no servidor é:
```
GET /api/extracao/conversas/:numeroId  → server.js linha 1822
```

Porém há também a rota do CHAT:
```
GET /api/chat/conversas/:numeroId      → server.js linha 1943
```

Se `extrairConversas()` chamar a rota do chat em vez da rota do extrator, retornará apenas os últimos 40 chats formatados para o chat (não para extração de números). Isso precisa ser verificado.

**Verificação necessária:** Confirmar qual URL `extrairConversas()` utiliza.

### 🟠 BUG — `getProfilePicUrl()` no extrator de agenda pode travar (herdado do chat)

**server.js linha 1950**

O endpoint `/api/chat/conversas` chama `getProfilePicUrl` para cada chat sem timeout. O extrator de conversas (`/api/extracao/conversas`) não tem esse problema, mas ao exibir grupos e membros, fotos de perfil também são buscadas.

### 🟡 MELHORIA — Sem filtro de "grupos" ou "privados" ao extrair conversas

O extrator de conversas retorna tudo misturado. Adicionar checkbox para filtrar apenas contatos individuais ou apenas grupos.

---

## 🧹 MÓDULO 3 — LIMPEZA DE LISTA

### 🩺 Diagnóstico
Módulo bem estruturado: recebe lista, verifica WhatsApp via `getNumberId()`, broadcasting em tempo real via WS, retorna válidos e inválidos. Tem pausa e parar funcionando. Resultado exportável em CSV.

### 🟠 BUG — `pausarTodos()` e `finalizarTodos()` nos botões da Limpeza afetam TODOS os disparos

**dashboard.html linhas 1059-1061**

```html
<button onclick="pausarTodos()">⏸ Pausar</button>
<button onclick="finalizarTodos()">🛑 Parar</button>
```

As funções `pausarTodos()` e `finalizarTodos()` chamam as rotas `/api/disparos/pausar-todos` e `/api/disparos/parar-todos`, que param **todos os disparos** em andamento do usuário — incluindo campanhas de disparo de mensagens privadas que estão rodando em paralelo.

A Limpeza tem sua própria rota de parada: `/api/limpeza/parar` (linha 1212 do server.js). Os botões deveriam chamar essa rota específica.

**Correção:**
```js
// Botão Pausar Limpeza:
async function pausarLimpeza() {
    await api.post('/api/limpeza/parar', {});
}
// Botão Parar Limpeza:
async function pararLimpeza() {
    await api.post('/api/limpeza/parar', {});
}
```

### 🟡 MELHORIA 1 — Sem delay configurável na limpeza

A limpeza verifica números sem delay entre chamadas, podendo gerar muitas requisições ao WhatsApp em sequência rápida. Adicionar um delay de 500ms-2000ms configurável.

### 🟡 MELHORIA 2 — Lista inválida não pode ser exportada separadamente

Só é possível exportar os válidos. Muitas vezes o usuário quer saber quais números são inválidos para remoção ou follow-up diferente.

---

## 📢 MÓDULO 4 — ENVIO A GRUPOS

### 🩺 Diagnóstico
Sistema de envio em massa para grupos com rotação de números, pausa automática, delay configurável, suporte a GPT e agendamento. Backend robusto. UI tem seleção múltipla de grupos.

### 🔴 CRÍTICO — `envioGruposStatus` não é isolado por usuário corretamente

**server.js linha 1375**

```js
envioGruposStatus[userId] = { status: 'rodando', ... };
```

O status é salvo por `userId`, o que é correto. Porém o objeto `job` é referenciado diretamente dentro do loop assíncrono:

```js
const job = envioGruposStatus[userId]; // ← referência direta
```

Se o usuário iniciar um segundo envio antes do primeiro terminar (possível via múltiplas abas ou requisições), `envioGruposStatus[userId]` será sobrescrito e o `job` do loop anterior apontará para o novo objeto, corrompendo o estado de ambos.

**Correção:** Usar um `jobId` único por execução:
```js
const jobId = `grupos_${Date.now()}`;
envioGruposStatus[`${userId}_${jobId}`] = { ... };
const job = envioGruposStatus[`${userId}_${jobId}`];
```

### 🟠 BUG — Rotação de número no envio de grupos usa índice que não reseta entre pausas/retomadas

**server.js linhas 1384-1450**

A variável `indiceAtual` controla qual número está sendo usado na rotação, mas é declarada localmente dentro da função `executarEnvioMassa()`. Se o servidor restartar, o estado é perdido e a rotação recomeça do índice 0. Isso é esperado, mas pode confundir usuários que acreditam que a rotação está distribuída uniformemente.

### 🟠 BUG — Sem verificação se o número emissor é ADMIN do grupo antes de enviar

**server.js linha 1427**

```js
await n.client.sendMessage(gruposIds[i], mensagem);
```

Se o grupo estiver configurado com "Apenas Admins podem enviar", o envio falhará com um erro genérico. O erro é capturado e logado mas o usuário não recebe feedback claro de que é um problema de permissão de admin.

**Melhoria:** Verificar `chat.isReadOnly` antes de tentar enviar.

### 🟡 MELHORIA — Sem preview de quantos grupos serão afetados antes de iniciar

Seria útil mostrar "Você selecionou X grupos, estimativa: Y minutos" antes de clicar em iniciar.

---

## 👥 MÓDULO 5 — ADD A GRUPOS (Adicionar Membros)

### 🩺 Diagnóstico
Sistema de adição em massa com dois modos: normal (com delay) e brutal (sem delay). Tem seleção de campanhas salvas + lista manual, rotação de chips, e progress bar em tempo real. Backend tem tratamento de erro por membro.

### 🔴 CRÍTICO — "Modo Brutal" lê o estado do toggle mas não passa para o server

**dashboard.html linha 1274**

```html
<div class="toggle" id="tgAddBrutal" onclick="this.classList.toggle('on')"></div>
```

O toggle do "Modo Brutal" alterna visualmente com `classList.toggle('on')`. Porém na função `adicionarAoGrupo()`, o código precisa ler esse toggle e passar `brutal: true` para a API. Se o server não receber esse flag, o modo brutal nunca é ativado.

**Verificação necessária:** Confirmar se `adicionarAoGrupo()` lê `tgAddBrutal.classList.contains('on')` e passa para o payload.

### 🟠 BUG — `addParticipants` retorna erros individuais mas o sistema trata como falha total

**server.js linhas 1594-1621**

```js
const resAdd = await chat.addParticipants(chunk);
```

`addParticipants()` no wwjs retorna um objeto com resultado por número (alguns adicionados, outros falhos). O código atual trata qualquer exceção como falha total do chunk, mas não processa os resultados individuais dentro de `resAdd`.

**Correção:** Processar o retorno de `addParticipants` para contar adicionados vs falhos individualmente.

### 🟡 MELHORIA — Não há verificação se o número do usuário É ADMIN do grupo alvo

Tentar adicionar membros em um grupo onde o número não é admin gera erro silencioso. Verificar `chat.participants.find(p => p.id._serialized === myJid)?.isAdmin` antes de iniciar.

---

## 👑 MÓDULO 6 — ASSINATURA (✅ JÁ CORRIGIDO)

**O painel foi completamente reescrito nesta sessão com:**
- ✅ Preço atualizado: `R$ 97,90` → **`R$ 47,90/mês`** (com desconto visual riscado)
- ✅ Seção Hero com gradiente premium
- ✅ Grid 2 colunas com 26 recursos listados por categoria
- ✅ 4 blocos de garantias (Ativação, Segurança, Updates, Suporte)
- ✅ CTA de suporte no rodapé
- ✅ Link para WhatsApp com mensagem pré-preenchida

---

## 📋 PLANO DE AÇÃO CONSOLIDADO

### 🔴 FASE 1 — Críticos (Executar Imediatamente)

| # | Arquivo | Problema | Ação |
|---|---------|----------|------|
| C1 | dashboard.html `iniciarDisparo()` | Delay em segundos não convertido para ms | Multiplicar `dispDelayEnvio` por 1000 |
| C2 | dashboard.html `adicionarAoGrupo()` | Verificar se Modo Brutal passa flag para server | Auditar e corrigir payload |
| C3 | server.js `envioGruposStatus` | Não isolado por execução | Usar jobId único |

### 🟠 FASE 2 — Médios (Próxima Sessão)

| # | Arquivo | Problema | Ação |
|---|---------|----------|------|
| M1 | dashboard.html Limpeza | `pausarTodos()` para disparos errados | Usar rota `/api/limpeza/parar` |
| M2 | server.js Add a Grupos | `addParticipants` retorno não processado | Iterar resultado individual |
| M3 | server.js Envio Grupos | Sem check de grupo read-only | Verificar `chat.isReadOnly` |
| M4 | dashboard.html Extrator | Verificar rota de `extrairConversas()` | Auditoria de URL |

### 🟡 FASE 3 — Melhorias (Backlog)

| # | Módulo | Melhoria |
|---|--------|----------|
| B1 | Disparo | Validar delay min=1, exibir número ativo |
| B2 | Extrator | Filtro grupo/privado na extração |
| B3 | Limpeza | Delay configurável + exportar inválidos |
| B4 | Envio Grupos | Preview de estimativa de tempo |
| B5 | Add Grupos | Verificar se é admin antes de iniciar |

---

## 🏁 CHECKLIST DE VERIFICAÇÃO

```
[ ] C1: iniciarDisparo() — dispDelayEnvio × 1000
[ ] C2: adicionarAoGrupo() — Modo Brutal passa flag ao server
[ ] C3: envioGruposStatus — jobId único por execução
[ ] M1: Limpeza — botões Pausar/Parar chamam /api/limpeza/parar
[ ] M2: addParticipants — iterar resultado individual
[ ] M3: Envio Grupos — verificar chat.isReadOnly antes de enviar
[ ] M4: extrairConversas() — confirmar URL correta
[ ] B1: Disparo — validação de delay
[ ] DONE: Assinatura — preço R$ 47,90 e layout completo ✅
[ ] TEST: Iniciar disparo → acompanhar delay correto no log
[ ] TEST: Pausar limpeza → não afeta disparos em andamento
[ ] TEST: Adicionar ao grupo com Modo Brutal → verifica se ignora delay
[ ] TEST: Enviar para grupo com "Apenas Admins" → erro claro na UI
```
