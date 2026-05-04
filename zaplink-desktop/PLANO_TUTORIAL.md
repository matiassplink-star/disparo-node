# 🛠️ Plano de Ação — Tutorial Dinâmico (Tour Interativo)

> **Auditoria realizada em:** 04/05/2026  
> **Arquivo auditado:** `dashboard.html` (linhas 460-601 CSS/HTML, linhas 3931-4068 JS)  
> **Arquivo:** Dados do tour estão presentes, mas com **4 bugs** e **1 erro de segurança crítico**

---

## 🔴 ERRO CRÍTICO — `require('electron')` NO DASHBOARD.HTML (linha 4051)

**Arquivo:** `dashboard.html` linha 4051  
**Problema:** O mesmo erro crítico que foi corrigido no `login.html` **existe também no `dashboard.html`**:

```js
// linha 4051 — ERRADO: require() em renderer com contextIsolation: true
try {
  const { ipcRenderer } = require('electron'); // ← QUEBRA com contextIsolation: true
  ipcRenderer.on('update-available', ...);
  ipcRenderer.on('update-downloaded', ...);
} catch(e) {}
```

Com `contextIsolation: true` (configuração atual do `main.js`), `require` não existe no renderer. O bloco `try/catch` **engole o erro silenciosamente** — as notificações de atualização nunca aparecerão para o usuário.

**Correção:** Expor os eventos de atualização via `contextBridge` no `preload.js`, igual ao padrão já adotado.

---

## 🟠 BUG 1 — `body.classList.add('tour-active')` bloqueia TODA a interação

**Arquivo:** `dashboard.html` linha 3975  
**Problema:**
```js
document.body.classList.add('tour-active');
```

O CSS define:
```css
.tour-active { pointer-events: none; }
```

Isso desabilita `pointer-events` no `<body>` inteiro, incluindo os botões "Próximo" e "Pular" do próprio tour (que estão DENTRO do `<body>`). O usuário **não consegue avançar ou fechar o tour** após ele abrir.

O `#tourBox` tem `pointer-events: auto` no CSS, mas como o pai (body) está com `none`, essa propriedade não tem efeito nos filhos.

**Correção:** Remover a classe `tour-active` do body. Se necessário bloquear cliques no fundo, usar um overlay separado com `pointer-events: none` que não seja pai dos botões do tour.

```js
// REMOVER estas linhas:
document.body.classList.add('tour-active'); // linha 3975
document.body.classList.remove('tour-active'); // linha 4034
```

---

## 🟠 BUG 2 — Posição do `tourBox` não considera o `scroll` da página

**Arquivo:** `dashboard.html` linhas 4004-4013  
**Problema:**
```js
const rect = target.getBoundingClientRect(); // retorna posição relativa ao viewport

let boxTop = rect.bottom + 20;
let boxLeft = rect.left;

box.style.top = boxTop + 'px'; // ← usa valor relativo ao viewport como se fosse absoluto
box.style.left = boxLeft + 'px';
```

`getBoundingClientRect()` retorna coordenadas **relativas ao viewport** (tela visível), mas `position: fixed` no CSS do `#tourBox` usa coordenadas relativas à janela — então na verdade isso **funciona corretamente** para `position: fixed`. Porém o `#tourHighlight` também tem `position: fixed`, portanto o highlight e o box devem estar alinhados corretamente.

**Problema Real:** Se o elemento-alvo for um elemento que está **oculto** (como `.stats-grid` que pode estar em scroll), o `rect` pode retornar valores fora do viewport, causando o box aparecer fora da tela.

**Correção:** Adicionar scroll automático para o elemento alvo antes de calcular posição.

```js
function showTourStep(idx) {
  const step = tourSteps[idx];
  const target = document.querySelector(step.target);
  
  if (!target) { nextTour(); return; }
  
  // Garante que o elemento está visível no viewport antes de posicionar
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Pequeno delay para o scroll completar antes de ler o getBoundingClientRect
  setTimeout(() => _positionTour(target, idx), 300);
}
```

---

## 🟠 BUG 3 — `currentTourStep` não é resetado ao chamar `startTour()` diretamente

**Arquivo:** `dashboard.html` linha 3969  
**Problema:**
```js
let currentTourStep = 0; // declarado uma vez globalmente

function startTour() {
  const skip = localStorage.getItem('zaplink_skip_tour');
  if (skip === 'true') return;
  
  // ← currentTourStep NÃO é resetado para 0 aqui
  document.getElementById('tourHighlight').classList.add('visible');
  document.getElementById('tourBox').classList.add('visible');
  document.body.classList.add('tour-active');
  showTourStep(0); // usa 0 hardcoded, mas currentTourStep pode ser > 0 por uma execução anterior
}
```

Se `startTour()` for chamado depois que o tour já passou por alguns passos (por exemplo, após um `resetTour()` falhar ou um ciclo de re-abertura), o `currentTourStep` fica no valor anterior. O botão "Próximo" pode pular diretamente para o fim.

**Correção:**
```js
function startTour() {
  const skip = localStorage.getItem('zaplink_skip_tour');
  if (skip === 'true') return;
  currentTourStep = 0; // ← resetar explicitamente
  document.getElementById('tourHighlight').classList.add('visible');
  document.getElementById('tourBox').classList.add('visible');
  showTourStep(0);
}
```

---

## 🟡 MELHORIA 1 — Tour inicia antes do WebSocket conectar e dados renderizarem

**Arquivo:** `dashboard.html` linha 4047  
**Problema:**
```js
setTimeout(startTour, 1500); // 1.5 segundos de delay
```

O tour começa 1.5s após carregar a página e tenta destacar `.stats-grid`, `.sidebar` etc. Porém o WebSocket pode ainda estar conectando e os dados ainda não foram renderizados. O elemento pode estar visível mas vazio, tornando o tour confuso.

**Correção:** Iniciar o tour apenas após o evento `init` do WebSocket ser recebido (quando os dados já estão disponíveis).

```js
// ANTES (linha 4047):
setTimeout(startTour, 1500);

// DEPOIS — no handler do WebSocket, após receber 'init':
if (tipo === 'init') {
  atualizarInit(dados);
  if (!localStorage.getItem('zaplink_skip_tour')) {
    setTimeout(startTour, 800); // delay menor pois WS já está pronto
  }
}
```

---

## 🟡 MELHORIA 2 — Nenhum botão na UI para rever o tour depois

**Arquivo:** `dashboard.html`  
**Problema:** A função `resetTour()` existe mas **nunca é chamada por nenhum botão na UI**. O usuário que quiser rever o tour não tem como fazê-lo, a não ser apagando o `localStorage` manualmente.

**Correção:** Adicionar botão "Tour" no sidebar ou no painel de Guia de Uso.

```html
<!-- Adicionar ao sidebar, próximo ao item "Guia de Uso" -->
<div class="nav-item" onclick="resetTour()">
  <span class="nav-icon">🎯</span> Tour Interativo
</div>
```

---

## 📋 RESUMO DE ERROS ENCONTRADOS

| # | Severidade | Tipo | Problema | Impacto |
|---|-----------|------|----------|---------|
| 1 | 🔴 Crítico | Segurança/Funcional | `require('electron')` no `dashboard.html` | Updates silenciosos nunca notificam |
| 2 | 🟠 Alto | Bug de UX | `pointer-events: none` no body bloqueia botões do tour | Tour **inutilizável** — usuário travado |
| 3 | 🟠 Médio | Bug de estado | `currentTourStep` não resetado no `startTour()` | Pulos inesperados de etapas |
| 4 | 🟠 Médio | Bug de posição | Sem scroll antes do `getBoundingClientRect()` | Box fora do viewport em telas menores |
| 5 | 🟡 Melhoria | UX | Tour inicia antes do WS conectar | Tour com dados vazios |
| 6 | 🟡 Melhoria | UX | Sem botão para rever o tour na UI | Usuário sem acesso ao tour após fechar |

---

## 🗓️ FASES DE CORREÇÃO

---

### 🔴 FASE 1 — Correção do `require('electron')` no dashboard (Crítico)

**Duração estimada:** 20 minutos  
**Arquivos:** `dashboard.html`, `preload.js`

#### Tarefa 1.1 — Expor `ipcRenderer` events via `contextBridge` no preload.js

O `preload.js` atual só expõe `openExternal`. Precisamos adicionar `onUpdate`:

```js
// preload.js — NOVO
import { contextBridge, shell, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('zaplink', {
  openExternal: (url) => shell.openExternal(url),
  version: '1.0.0',
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_, info) => cb(info)),
});
```

#### Tarefa 1.2 — Substituir o bloco `require` no `dashboard.html` (linha 4050-4068)

```js
// ANTES (linhas 4050-4068) — REMOVER:
try {
  const { ipcRenderer } = require('electron');
  ipcRenderer.on('update-available', ...);
  ipcRenderer.on('update-downloaded', ...);
} catch(e) {}

// DEPOIS — usar contextBridge:
if (window.zaplink?.onUpdateAvailable) {
  window.zaplink.onUpdateAvailable((info) => {
    toast('Nova versão encontrada! Baixando em segundo plano...', 'info');
  });
  window.zaplink.onUpdateDownloaded((info) => {
    toast('Atualização baixada! Reinicie o ZapLink para aplicar.', 'success');
    document.getElementById('listaNotificacoes').insertAdjacentHTML('afterbegin', `
      <div style="padding:15px; background:rgba(59,130,246,0.1); border:1px solid var(--info); border-radius:10px; margin-bottom:10px;">
        <div style="font-size:13px; font-weight:bold; margin-bottom:4px; color:var(--info);">Nova Versão Pronta</div>
        <div style="font-size:12px; color:var(--muted); line-height:1.5;">O download foi concluído. Reinicie o aplicativo agora para aplicar a atualização.</div>
      </div>
    `);
    const badge = document.getElementById('badgeNotif');
    badge.style.display = 'flex';
    badge.innerText = '!';
  });
}
```

---

### 🟠 FASE 2 — Correção dos Bugs do Tour (Alto Impacto)

**Duração estimada:** 30 minutos  
**Arquivos:** `dashboard.html`

#### Tarefa 2.1 — Remover `tour-active` do body (BUG 2)

Localizar e remover as referências a `tour-active`:
- Linha ~3975: `document.body.classList.add('tour-active');` → **REMOVER**
- Linha ~4034: `document.body.classList.remove('tour-active');` → **REMOVER**

#### Tarefa 2.2 — Resetar `currentTourStep` no `startTour()` (BUG 3)

```js
function startTour() {
  const skip = localStorage.getItem('zaplink_skip_tour');
  if (skip === 'true') return;
  currentTourStep = 0; // ← ADICIONAR
  document.getElementById('tourHighlight').classList.add('visible');
  document.getElementById('tourBox').classList.add('visible');
  showTourStep(0);
}
```

#### Tarefa 2.3 — Adicionar scroll automático + delay (BUG 4)

Refatorar `showTourStep` para scrollar antes de posicionar o box:

```js
function showTourStep(idx) {
  const step = tourSteps[idx];
  const target = document.querySelector(step.target);
  const highlight = document.getElementById('tourHighlight');
  const box = document.getElementById('tourBox');
  
  if (!target) { nextTour(); return; }
  
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  setTimeout(() => {
    const rect = target.getBoundingClientRect();
    const padding = 10;
    
    highlight.style.top = (rect.top - padding) + 'px';
    highlight.style.left = (rect.left - padding) + 'px';
    highlight.style.width = (rect.width + padding * 2) + 'px';
    highlight.style.height = (rect.height + padding * 2) + 'px';
    
    document.getElementById('tourTitle').innerText = step.title;
    document.getElementById('tourContent').innerText = step.content;
    document.getElementById('tourIcon').innerText = step.icon;
    document.getElementById('tourStep').innerText = `Passo ${idx + 1} de ${tourSteps.length}`;
    
    let boxTop = rect.bottom + 20;
    let boxLeft = rect.left;
    
    if (boxTop + 280 > window.innerHeight) boxTop = rect.top - 290;
    if (boxLeft + 340 > window.innerWidth) boxLeft = window.innerWidth - 350;
    if (boxLeft < 10) boxLeft = 10;
    if (boxTop < 10) boxTop = 10;
    
    box.style.top = boxTop + 'px';
    box.style.left = boxLeft + 'px';
    
    document.getElementById('btnNextTour').innerText = 
      idx === tourSteps.length - 1 ? 'Concluir ✓' : 'Próximo →';
  }, 200);
}
```

---

### 🟡 FASE 3 — Melhorias de UX do Tour

**Duração estimada:** 20 minutos  
**Arquivos:** `dashboard.html`

#### Tarefa 3.1 — Disparar tour após WebSocket conectar (MELHORIA 1)

No handler do WebSocket (buscar `if (tipo === 'init')`), adicionar:
```js
if (tipo === 'init') {
  atualizarInit(dados);
  // Tour só começa quando o sistema estiver pronto
  setTimeout(startTour, 600);
}
```

E remover o `setTimeout(startTour, 1500)` da linha 4047.

#### Tarefa 3.2 — Adicionar botão de rever o tour no sidebar (MELHORIA 2)

```html
<!-- Adicionar após o item "Guia de Uso" na sidebar -->
<div class="nav-item" onclick="resetTour()" title="Rever o tour de boas-vindas">
  <span class="nav-icon">🎯</span>
  <span class="nav-label">Tour Interativo</span>
</div>
```

---

## 🏁 CHECKLIST DE VERIFICAÇÃO

```
[ ] FASE 1: preload.js atualizado com onUpdateAvailable e onUpdateDownloaded
[ ] FASE 1: require('electron') removido do dashboard.html
[ ] FASE 2: tour-active removido do body (BUG do pointer-events)
[ ] FASE 2: currentTourStep = 0 adicionado no startTour()
[ ] FASE 2: scrollIntoView + setTimeout adicionado no showTourStep()
[ ] FASE 3: tour iniciado após evento 'init' do WS
[ ] FASE 3: botão Tour Interativo adicionado ao sidebar
[ ] TEST: Abrir o app → tour aparece após WS conectar
[ ] TEST: Clicar em "Próximo" → avança corretamente
[ ] TEST: Clicar em "Pular" → fecha o tour
[ ] TEST: Marcar "Não mostrar novamente" → tour não aparece no próximo restart
[ ] TEST: Clicar em "Tour Interativo" no sidebar → tour reinicia
```
