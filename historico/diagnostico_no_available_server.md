# Diagnóstico: "no available server" no Coolify

**Data:** 28/04/2026  
**Commit da correção:** `da05153`

---

## Causa Raiz (3 problemas encontrados)

### Problema 1: Endpoint `/api/health` NÃO EXISTIA ⚠️ CRÍTICO
O `docker-compose.yml` tinha um **healthcheck** configurado que batia em `http://localhost:3001/api/health` a cada 30 segundos. Porém, essa rota **nunca foi criada** no `server.js`. O resultado:
- Docker perguntava: "Você tá vivo?" (`GET /api/health`)
- Servidor respondia: **404 Not Found**
- Docker interpretava: "Ele morreu" → **Matava o container** → Traefik mostrava "no available server"
- Isso acontecia em loop infinito: sobe → healthcheck falha → mata → reinicia → repete

### Problema 2: Porta 3001 vs Porta 3000
O nosso servidor escutava na porta `3001`, mas:
- O **Dockerfile** expunha `3001` (ok)
- O **Coolify/Traefik** por padrão roteia tráfego para a porta `3000`
- Resultado: o tráfego chegava na porta 3000, mas ninguém estava escutando lá → "no available server"

### Problema 3: Chromium SingletonLock em camadas profundas
O Puppeteer (whatsapp-web.js) cria arquivos `SingletonLock` dentro de subpastas aninhadas do perfil do Chromium. Cada container Docker tem um hostname diferente (ex: `e43eb910e6cb`). Quando um novo container sobe, o Chromium vê o lock do container antigo e pensa que "outro computador" está usando o perfil → **crash Code 21**. A limpeza anterior só buscava em 2 caminhos fixos, mas os locks estavam em subpastas mais profundas.

---

## O Que Foi Corrigido (Commit `da05153`)

### server.js
1. **Criado `GET /api/health`** → Retorna `{ status: "ok" }` para que o Docker/Coolify saibam que o servidor está vivo.
2. **Porta alterada** de `3001` para `3000` (padrão do Coolify).
3. **Limpeza recursiva de locks** → Em vez de buscar em 6 caminhos fixos, agora varre TODA a pasta da sessão deletando qualquer arquivo que comece com "Singleton".
4. **Sessões carregam DEPOIS** do `server.listen()` → O servidor começa a responder ao healthcheck imediatamente, e só depois (em background) carrega os WhatsApps. Isso evita que o Docker mate o container por "demora pra iniciar".

### docker-compose.yml
1. Porta alterada de `3001:3001` para `3000:3000`.
2. Healthcheck atualizado para bater em `localhost:3000`.
3. Adicionado `start_period: 120s` → Docker espera 2 minutos antes de começar a checar a saúde (tempo para os WhatsApps carregarem).
4. `retries` aumentado de 3 para 5.

### Dockerfile
1. `EXPOSE` alterado de `3001` para `3000`.

---

## Verificação

Após o deploy no Coolify:
1. Acessar `https://zap.casabrokersistema.online/api/health`
2. Deve retornar: `{"status":"ok","uptime":X.XXX}`
3. Se retornar isso, o painel principal também vai funcionar.
