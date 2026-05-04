# 🔍 Auditoria Isolada — Sistema de Chat (ZapLink Desktop)

> **Data:** 04/05/2026  
> **Arquivos auditados:** `server.js` (linhas 602-630, 1942-2019), `dashboard.html` (linhas 3116-3412)

---

## 🩺 DIAGNÓSTICO GERAL

O sistema de chat está **funcionalmente implementado** com rotas REST, listeners WebSocket em tempo real e uma UI estilo WhatsApp. Porém foram identificados **8 problemas** — 2 críticos que podem causar falhas silenciosas.

---

## 🔴 CRÍTICO 1 — `chatId` com caracteres especiais não está codificado corretamente na URL (linha 3216)

**Arquivo:** `dashboard.html` linha 3216  
**Problema:**
```js
const data = await api.get(`/api/chat/mensagens/${numeroChatAtual}/${encodeURIComponent(id)}`);
```

O `id` de um chat pode conter caracteres especiais como `@`, `+`, `:`, que em URLs são reservados. O `encodeURIComponent` está sendo aplicado aqui, **mas na função `renderizarListaConversas()` o `onclick` usa interpolação direta da string `c.id` sem codificação:**

```js
// Linha 3154 — PROBLEMA: aspas simples dentro do id podem quebrar o onclick
onclick="abrirConversa('${c.id}', '${c.name.replace(/'/g,"\\'")}', '${c.pic || ''}')"
```

Se `c.id` contiver uma aspa simples (raro mas possível em grupos com nomes estranhos), o atributo `onclick` fica sintaticamente inválido. O correto seria usar `data-attributes` com `addEventListener`.

---

## 🔴 CRÍTICO 2 — Condição de corrida: `carregarConversas()` auto-chamado antes do número ser selecionado (linha 2027)

**Arquivo:** `dashboard.html` linha 2025-2027  
**Problema:**
```js
} else if (conectado.length > 0) {
    selChat.value = conectado[0].id;
    carregarConversas(); // Auto-load if none was selected  ← sem await, pode ser chamado múltiplas vezes
}
```

`atualizarNumeros()` é chamada cada vez que o WebSocket recebe `tipo === 'numeros'`. Se o cliente reconectar várias vezes rapidamente, `carregarConversas()` pode ser disparado múltiplas vezes em paralelo, causando race condition na variável `conversasAtuais`.

Risco: A lista de conversas pode ser sobrescrita por uma resposta antiga, mostrando dados desatualizados.

**Correção:** Adicionar flag de lock para evitar chamadas duplas:
```js
let carregandoConversas = false;

async function carregarConversas() {
  if (carregandoConversas) return;
  carregandoConversas = true;
  try {
    // ... lógica existente
  } finally {
    carregandoConversas = false;
  }
}
```

---

## 🟠 BUG 3 — `handleNovaMensagem` atualiza o chat oposto ao esperado (linha 3309)

**Arquivo:** `dashboard.html` linha 3309  
**Problema:**
```js
if (dados.numeroId === numeroChatAtual) {
    if (conversaSelecionada === dados.chatId) {
```

O `dados.chatId` para mensagens recebidas é o `from` do remetente (ex: `5534999@c.us`), e para mensagens enviadas é o `to` do destinatário — conforme o server:

```js
// server.js linha 606 — mensagem recebida:
chatId: msg.from,

// server.js linha 621 — mensagem enviada:
chatId: msg.to,
```

Isso está **correto**, mas o problema é que ao receber uma mensagem de um chat diferente do aberto (`conversaSelecionada`), a lista lateral é atualizada via `renderizarListaConversas()` na linha 3351 — porém o `convIdx` busca por `dados.chatId`, que para msgs recebidas é `msg.from`.

Se o usuário estiver visualizando a conversa com `55349999@c.us` e receber uma mensagem de `55341111@c.us`, **a lista lateral pisca/re-renderiza** porque `renderizarListaConversas` faz `list.innerHTML = ...` — resetando o scroll e a seleção visual do chat ativo.

**Correção:** Atualizar apenas o item específico na lista, sem re-renderizar toda a lista.

---

## 🟠 BUG 4 — Áudio gravado: `mediaRecorder.stop()` é chamado, mas `onstop` usa `chatId` e `numeroChatAtual` por closure que pode ter mudado (linha 3376-3380)

**Arquivo:** `dashboard.html` linha 3376  
**Problema:**
```js
mediaRecorder.onstop = async () => {
    // ...
    await api.post('/api/chat/enviar', { 
        numeroId: numeroChatAtual,    // ← capturado via closure no momento do stop
        chatId: conversaSelecionada,  // ← pode ter mudado entre start e stop!
    });
};
```

Se o usuário trocar de conversa enquanto está gravando (possível pois o botão stop ainda está visível), `conversaSelecionada` e `numeroChatAtual` já terão o novo valor quando `onstop` executar, enviando o áudio para a conversa **errada**.

**Correção:** Capturar os valores no momento do `start`:
```js
// Dentro do if (!gravando):
const numeroParaEnviar = numeroChatAtual;
const chatParaEnviar = conversaSelecionada;

mediaRecorder.onstop = async () => {
    // usar numeroParaEnviar e chatParaEnviar em vez das variáveis globais
};
```

---

## 🟠 BUG 5 — `getProfilePicUrl` sem timeout causa bloqueio do endpoint (server.js linha 1950)

**Arquivo:** `server.js` linha 1948-1958  
**Problema:**
```js
const result = await Promise.all(chats.slice(0, 40).map(async c => {
    let pic = null;
    try { pic = await n.client.getProfilePicUrl(c.id._serialized); } catch {}  // ← pode demorar muito
    return { id, name, lastMessage, unreadCount, isGroup, pic };
}));
```

`Promise.all` com 40 chamadas paralelas a `getProfilePicUrl` é problemático:
1. Cada chamada pode demorar 1-3 segundos em redes lentas
2. Em paralelo, 40 chamadas simultâneas podem sobrecarregar a biblioteca wwjs
3. O endpoint `/api/chat/conversas/:numeroId` pode demorar **30+ segundos** para responder

**Correção:** Usar `Promise.allSettled` com timeout por chamada:
```js
const result = await Promise.all(chats.slice(0, 40).map(async c => {
    let pic = null;
    try { 
        pic = await Promise.race([
            n.client.getProfilePicUrl(c.id._serialized),
            new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
        ]);
    } catch {}
    return { id: c.id._serialized, name: c.name, lastMessage: c.lastMessage ? {...} : null, unreadCount: c.unreadCount, isGroup: c.isGroup, pic };
}));
```

---

## 🟡 MELHORIA 6 — `new_message` via WS não atualiza a lista de conversas se `conversasAtuais` estiver vazia

**Arquivo:** `dashboard.html` linha 3346  
**Problema:**
```js
const convIdx = conversasAtuais.findIndex(c => c.id === dados.chatId);
if (convIdx !== -1) { // ← se a lista estiver vazia ou não carregada, a mensagem é ignorada
    // ...
}
```

Se o usuário receber uma mensagem de um contato que não está na lista carregada (os 40 mais recentes), ou se `conversasAtuais` ainda não foi populada, a mensagem nova não aparece na lista lateral.

**Correção:** Se `convIdx === -1`, adicionar o novo contato à lista:
```js
const convIdx = conversasAtuais.findIndex(c => c.id === dados.chatId);
if (convIdx !== -1) {
    const conv = conversasAtuais.splice(convIdx, 1)[0];
    conv.lastMessage = { body: dados.body, timestamp: dados.timestamp };
    conversasAtuais.unshift(conv);
} else {
    // Novo contato não mapeado ainda — adicionar ao topo
    conversasAtuais.unshift({
        id: dados.chatId,
        name: dados.name || dados.chatId.split('@')[0],
        lastMessage: { body: dados.body, timestamp: dados.timestamp },
        unreadCount: 1,
        isGroup: dados.chatId.includes('@g.us'),
        pic: null
    });
}
renderizarListaConversas(conversasAtuais);
```

---

## 🟡 MELHORIA 7 — Mensagem `fromMe` optimista sem deduplicação (linha 3314)

**Arquivo:** `dashboard.html` linha 3313-3315  
**Problema:**
```js
if (dados.fromMe) {
    const tempMsgs = box.querySelectorAll('.msg-me[id^="temp-"]');
    if (tempMsgs.length > 0) tempMsgs[0].remove(); // ← remove PRIMEIRO temp, não o correto
}
```

Se o usuário enviar mensagens rapidamente, podem existir múltiplas `temp-*` ao mesmo tempo. A lógica remove sempre o **primeiro** temp encontrado, não necessariamente o correspondente à mensagem confirmada.

**Correção:** Usar o `id` real retornado pelo servidor para remover o temp correto, ou usar o `data-temp-id` gerado localmente.

---

## 🟡 MELHORIA 8 — Sem indicador de "digitando..." ou status de entrega

**Arquivo:** `dashboard.html`, `server.js`  
**Observação:** A funcionalidade de "presença" (digitando, online, entregue, lido) não está implementada. Não é um bug, mas é uma lacuna de UX esperada pelos usuários de um chat WhatsApp.

O server.js já usa `client.sendPresenceUpdate('composing', chatId)` durante os disparos — poderia ser reutilizado para o chat em tempo real.

---

## 📋 RESUMO DOS PROBLEMAS

| # | Severidade | Problema | Impacto |
|---|-----------|----------|---------|
| **1** | 🔴 Crítico | `onclick` direto com `c.id` no HTML — XSS + quebra de UI | Chat pode travar em grupos com nomes especiais |
| **2** | 🔴 Crítico | `carregarConversas()` sem lock — race condition | Lista de conversas pode ser corrompida |
| **3** | 🟠 Alto | `renderizarListaConversas` reseta innerHTML completo em tempo real | Pisca e perde scroll ao receber msgs |
| **4** | 🟠 Alto | Áudio envia para conversa errada se trocar de chat durante gravação | Mensagem de voz entregue no lugar errado |
| **5** | 🟠 Alto | `getProfilePicUrl` × 40 sem timeout — endpoint pode demorar 30s+ | App parece travado ao abrir o chat |
| **6** | 🟡 Médio | Mensagem nova ignorada se não estiver nos 40 carregados | Usuário perde msgs de contatos mais antigos |
| **7** | 🟡 Baixo | Remoção do "temp" errado quando múltiplas msgs rápidas | Duplicação visual de bolhas |
| **8** | 🟡 Info | Sem "digitando..." ou status de entrega | UX incompleta vs WhatsApp nativo |

---

## 🗓️ PLANO DE CORREÇÃO

### 🔴 FASE 1 — Fixes Críticos de Estabilidade

**Duração:** ~30 min | **Prioridade:** MÁXIMA

1. **Correção do onclick** → Mover para `addEventListener` com `dataset`
2. **Lock em `carregarConversas()`** → Adicionar flag `carregandoConversas`

### 🟠 FASE 2 — Correções de Comportamento

**Duração:** ~45 min | **Prioridade:** ALTA

3. **Timeout em `getProfilePicUrl`** no server.js
4. **Capturar `chatId` no início da gravação** em `toggleGravacao()`
5. **Update cirúrgico na lista lateral** (sem `innerHTML` completo)

### 🟡 FASE 3 — Melhorias de UX

**Duração:** ~30 min | **Prioridade:** MÉDIA

6. **Adicionar contato novo ao `conversasAtuais`** quando msg recebida
7. **Deduplicação de msgs otimistas** por ID

---

## 🏁 CHECKLIST

```
[ ] CRÍTICO 1: onclick → dataset + addEventListener
[ ] CRÍTICO 2: lock em carregarConversas()
[ ] BUG 3: update cirúrgico da lista lateral sem resetar innerHTML
[ ] BUG 4: capturar chatId/numeroId no início da gravação
[ ] BUG 5: timeout de 2s em getProfilePicUrl no server.js
[ ] MELHORIA 6: adicionar novo contato ao conversasAtuais
[ ] MELHORIA 7: deduplicação por temp ID
[ ] TEST: Abrir chat → lista carrega sem travar
[ ] TEST: Receber msg → aparece sem piscar
[ ] TEST: Gravar áudio → vai para a conversa certa
[ ] TEST: Trocar de conversa rapidamente → não duplica mensagens
```
