# Plano de Escala e Migração para Baileys (Até 1000 Usuários)

Este documento detalha o plano estratégico para substituir a biblioteca `whatsapp-web.js` atual pela biblioteca `@whiskeysockets/baileys`, a fim de reduzir drasticamente o consumo de memória RAM do servidor e permitir a escala para até 1000 usuários simultâneos.

## ⚠️ Por que a migração é necessária?

Atualmente, usamos o `whatsapp-web.js`. Ele usa o **Puppeteer** (um navegador Chromium invisível) para cada conta de WhatsApp.
- **Consumo atual:** ~200MB de RAM por conta.
- **1000 contas =** 200 Gigabytes de RAM! (Isso exigiria um servidor de mais de R$3.000 mensais).

Com o **Baileys**, nós nos conectamos diretamente ao servidor da Meta (WhatsApp) via WebSocket, sem usar navegadores.
- **Consumo Baileys:** ~15MB a 30MB de RAM por conta.
- **1000 contas =** ~15 a 30 Gigabytes de RAM (Um servidor de R$300 na Hetzner segura com facilidade).

## Proposed Changes (Plano de Ação)

A migração é profunda e precisará ser feita em fases, pois a forma de interagir com o WhatsApp muda completamente (envio de mensagens, leitura de grupos, eventos, etc).

### Fase 1: Setup e Autenticação (Baileys Auth)
- Instalar `@whiskeysockets/baileys` e remover dependências do Puppeteer.
- Refatorar a função de geração de QR Code: O Baileys emite o QR code como string, que deve ser convertido para base64 para o frontend atual.
- Substituir a estratégia `LocalAuth` do whatsapp-web.js pelo `useMultiFileAuthState` do Baileys para armazenar as credenciais na pasta `sessoes/`.

### Fase 2: Refatoração dos Controladores Base
- **Envio de Mensagem:** Substituir `client.sendMessage(to, text)` por `sock.sendMessage(jid, { text })`.
- **Extração de Contatos:** O Baileys não tem um `getContacts()` nativo fácil igual ao wwebjs. Precisamos escutar o evento `contacts.upsert` ou ler o banco de dados interno (store) do Baileys para extrair a agenda.
- **Leitura de Grupos:** Substituir a lógica de `client.getChats()` para ler os metadados dos grupos usando `sock.groupMetadata(id)`.

### Fase 3: Refatoração da Automação (Disparos e Limpeza)
- **Verificador de Números (Limpeza):** Substituir `client.isRegisteredUser(number)` pelo comando `sock.onWhatsApp(jid)` do Baileys para validar se um número existe antes de enviar mensagem.
- Refatorar o sistema de disparo em massa (`disparos` loop) para usar a nova sintaxe do Baileys, respeitando o Delay Anti-Ban.

---

## ⚠️ Riscos e Considerações

> [!WARNING]
> O Baileys é muito mais "cru" que o whatsapp-web.js. Tarefas simples como baixar mídia, ver histórico antigo ou resgatar a agenda inteira exigem mais código manual. É comum que no começo a extração de contatos não traga 100% da agenda imediatamente (o WhatsApp envia os contatos aos poucos para o Baileys após conectar).

## Open Questions

> [!CAUTION]
> 1. **Zero Downtime:** Para fazer essa migração, as sessões salvas atuais (as 8 que você tem conectadas agora) **serão perdidas**, pois o formato de salvamento de sessão do Chromium é diferente do Baileys. Os usuários terão que ler o QR code de novo. Tudo bem?
> 2. **Prioridade:** Nós deveríamos fazer a migração pro Baileys **agora** (antes do CRM/Chat Interno), ou quer deixar rodando com Puppeteer por enquanto (que aguenta de boa uns 40-50 clientes) e focar em entregar as funcionalidades pro usuário final?
