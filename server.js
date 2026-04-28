import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia, Buttons } = pkg;
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const CONTAS_FILE = './logs/contas_metadata.json';
if (!fs.existsSync('./logs')) fs.mkdirSync('./logs');
if (!fs.existsSync(CONTAS_FILE)) fs.writeFileSync(CONTAS_FILE, '{}');

function salvarMetadadosContas() {
    const meta = {};
    Object.entries(numeros).forEach(([id, n]) => {
        if (n.numero || n.nome || n.proxy) {
            meta[id] = { numero: n.numero, nome: n.nome, proxy: n.proxy };
        }
    });
    fs.writeFileSync(CONTAS_FILE, JSON.stringify(meta, null, 2));
}

function carregarMetadadosContas() {
    try {
        return JSON.parse(fs.readFileSync(CONTAS_FILE, 'utf8'));
    } catch { return {}; }
}

const metaSalva = carregarMetadadosContas();

app.use(express.json({ limit: '50mb' }));

// ─── proteção: bloqueia acesso direto e faz isolamento ─────────
const SAAS_ORIGIN = process.env.SAAS_URL || 'https://zaplink.casalbrokersistema.online';
if (!process.env.WA_AUTH_TOKEN) {
    console.warn('⚠️ AVISO: WA_AUTH_TOKEN não está definido. Usando token padrão (inseguro). Configure a variável de ambiente no Coolify quando puder.');
}
const AUTH_TOKEN = process.env.WA_AUTH_TOKEN || 'zaplink_default_token_secure_123';

function verifyIframeToken(t) {
    if (!t) return null;
    if (t === AUTH_TOKEN) return { userId: 'admin', plano: 'admin' };
    const parts = t.split(':');
    
    // Suporta tokens antigos (3 partes) e novos (4 partes com plano)
    if (parts.length === 3) {
        const [userId, expires, signature] = parts;
        const payload = `${userId}:${expires}`;
        const expectedSig = crypto.createHmac('sha256', AUTH_TOKEN).update(payload).digest('hex');
        if (signature !== expectedSig) {
            console.log(`[AUTH-DEBUG] Assinatura inválida (3 partes). Expected: ${expectedSig}, Got: ${signature}`);
            return null;
        }
        if (Date.now() > (parseInt(expires) + 86400000)) {
            console.log(`[AUTH-DEBUG] Token expirado (3 partes). Expira em: ${expires}`);
            return null;
        }
        return { userId, plano: 'free' }; 
    } else if (parts.length === 4) {
        const [userId, expires, plano, signature] = parts;
        const payload = `${userId}:${expires}:${plano}`;
        const expectedSig = crypto.createHmac('sha256', AUTH_TOKEN).update(payload).digest('hex');
        if (signature !== expectedSig) {
            console.log(`[AUTH-DEBUG] Assinatura inválida (4 partes). Expected: ${expectedSig}, Got: ${signature}, Payload: ${payload}`);
            return null;
        }
        if (Date.now() > (parseInt(expires) + 86400000)) {
            console.log(`[AUTH-DEBUG] Token expirado (4 partes). Expira em: ${expires}`);
            return null;
        }
        return { userId, plano };
    }
    
    console.log(`[AUTH-DEBUG] Formato de token desconhecido. Length: ${parts.length}, Token: ${t}`);
    return null;
}

app.use((req, res, next) => {
    // Permitir sempre assets estáticos (não são a página principal)
    const ext = path.extname(req.path);
    if (ext && ext !== '.html') {
        return next();
    }
    
    // Verificar token seguro (HMAC) ou legacy admin token
    const token = req.query.token;
    const authData = verifyIframeToken(token);
    
    // Se for válido, anexamos o userId à request
    if (authData) {
        req.userId = authData.userId;
        req.plano = authData.plano;
        console.log(`[AUTH] Usuário ${req.userId} logado com plano: ${req.plano}`);
        return next();
    }
    
    // Bloquear: redirecionar para o SaaS
    res.status(403).send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><title>Acesso Restrito</title>
        <style>
            body{margin:0;background:#0e0f11;color:#e8eaed;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}
            .box{text-align:center;max-width:400px;padding:40px}
            h1{font-size:24px;margin-bottom:12px}
            p{color:#6b7280;font-size:14px;line-height:1.6;margin-bottom:24px}
            a{display:inline-block;background:#22c55e;color:#0a1a10;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
            a:hover{filter:brightness(1.1)}
        </style></head>
        <body><div class="box">
            <h1>🔒 Acesso Restrito</h1>
            <p>Este sistema só pode ser acessado através do painel ZapLink.</p>
            <a href="${SAAS_ORIGIN}/auth/login">Ir para o Login</a>
        </div></body></html>
    `);
});

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

// ─── pastas ────────────────────────────────────────────────
['./contatos', './sessoes', './midia', './logs'].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ─── estado global ─────────────────────────────────────────
const numeros = {};
const disparos = {};
const addGruposStatus = {}; // { userId: { status, total, atual, resultados } }
const envioGruposStatus = {}; // { userId: { status, total, atual, enviados, falhas } }
const limpezaStatus = {}; // { userId: { status, total, atual, validos, invalidos } }

// ─── limites por plano ────────────────────────────────────
const LIMITES = {
    'free':                 { conexoes: 1,     enviosDia: 50,    listas: 1,     gpt: false, rotacao: false },
    'Recruta Iniciante':    { conexoes: 1,     enviosDia: 50,    listas: 1,     gpt: false, rotacao: false },
    'pro':                  { conexoes: 10,    enviosDia: 99999, listas: 99999, gpt: true,  rotacao: true  },
    'premium':              { conexoes: 10,    enviosDia: 99999, listas: 99999, gpt: true,  rotacao: true  },
    'mensal':               { conexoes: 2,     enviosDia: 99999, listas: 99999, gpt: false, rotacao: true  },
    'Soldado do Disparo':   { conexoes: 2,     enviosDia: 99999, listas: 99999, gpt: false, rotacao: true  },
    'semestral':            { conexoes: 5,     enviosDia: 99999, listas: 99999, gpt: false, rotacao: true  },
    'Comandante de Escala': { conexoes: 5,     enviosDia: 99999, listas: 99999, gpt: false, rotacao: true  },
    'anual':                { conexoes: 99999, enviosDia: 99999, listas: 99999, gpt: true,  rotacao: true  },
    'General das Vendas':   { conexoes: 99999, enviosDia: 99999, listas: 99999, gpt: true,  rotacao: true  },
    'admin':                { conexoes: 99999, enviosDia: 99999, listas: 99999, gpt: true,  rotacao: true  },
};

function getLimites(plano) {
    if (!plano) return LIMITES.free;
    const p = plano.trim();
    
    // Retorno direto se for match exato
    if (LIMITES[p]) return LIMITES[p];
    
    // Buscas flexíveis por palavras-chave
    const pLower = p.toLowerCase();
    if (pLower.includes('general') || pLower.includes('vendas')) return LIMITES['General das Vendas'];
    if (pLower.includes('comandante') || pLower.includes('escala')) return LIMITES['Comandante de Escala'];
    if (pLower.includes('soldado')) return LIMITES['Soldado do Disparo'];
    if (pLower.includes('recruta')) return LIMITES['Recruta Iniciante'];
    if (pLower.includes('admin')) return LIMITES['admin'];
    
    return LIMITES.free;
}

// ─── limites diários (Plano Free) ──────────────────────────
const enviosPath = './logs/envios_diarios.json';
if (!fs.existsSync(enviosPath)) fs.writeFileSync(enviosPath, '{}');

function registrarEnvio(userId, plano) {
    if (plano !== 'free') return true;
    let stats = {};
    try { stats = JSON.parse(fs.readFileSync(enviosPath, 'utf8')); } catch {}
    const hoje = new Date().toISOString().split('T')[0];
    
    if (!stats[userId]) stats[userId] = {};
    if (!stats[userId][hoje]) stats[userId][hoje] = 0;
    
    if (stats[userId][hoje] >= 50) return false;
    
    stats[userId][hoje]++;
    fs.writeFileSync(enviosPath, JSON.stringify(stats, null, 2));
    return true;
}

// ─── gestão de proxy pool ──────────────────────────────────
const PROXY_POOL_FILE = './logs/proxy_pool.json';
if (!fs.existsSync(PROXY_POOL_FILE)) fs.writeFileSync(PROXY_POOL_FILE, '[]');

function carregarProxyPool() {
    try { return JSON.parse(fs.readFileSync(PROXY_POOL_FILE, 'utf8')); } catch { return []; }
}

function salvarProxyPool(pool) {
    fs.writeFileSync(PROXY_POOL_FILE, JSON.stringify(pool, null, 2));
}

import net from 'net';

import { performance } from 'perf_hooks';

async function testarProxy(proxyUrl) {
    return new Promise((resolve) => {
        const start = performance.now();
        const clean = proxyUrl.replace('http://', '').replace('https://', '').split('@').pop();
        const parts = clean.split(':');
        const host = parts[0];
        const port = parseInt(parts[1]);

        if (!host || !port) return resolve(null);

        const socket = net.connect(port, host, () => {
            const latencia = Math.round(performance.now() - start);
            socket.destroy();
            resolve(latencia);
        });

        socket.setTimeout(4000);
        socket.on('timeout', () => { socket.destroy(); resolve(null); });
        socket.on('error', () => { socket.destroy(); resolve(null); });
    });
}

async function capturarProxies() {
    const urls = [
        // Focado em Brasil (BR)
        'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=BR&ssl=all&anonymity=all',
        'https://www.proxy-list.download/api/v1/get?type=http&country=BR',
        'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=10000&country=BR',
        'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=BR'
    ];

    let novosProxies = [];
    for (const url of urls) {
        try {
            const res = await fetch(url);
            const text = await res.text();
            const matches = text.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5}\b/g);
            if (matches) novosProxies = [...novosProxies, ...matches];
        } catch (e) { console.error(`Erro ao capturar de ${url}:`, e.message); }
    }

    const poolAtual = carregarProxyPool();
    const unique = [...new Set([...novosProxies])];
    
    const novaPool = [];
    console.log(`📡 Testando ${unique.length} novos proxies capturados...`);
    
    // Testar em paralelo (limitado para não travar o servidor)
    const batches = [];
    for (let i = 0; i < unique.length; i += 10) batches.push(unique.slice(i, i + 10));

    for (const batch of batches) {
        await Promise.all(batch.map(async (p) => {
            const latencia = await testarProxy(p);
            if (latencia !== null) {
                novaPool.push({ url: p, status: 'ativo', latencia, capturadoEm: new Date().toISOString() });
            }
        }));
    }

    // Ordenar pela menor latência
    const poolFinal = [...poolAtual, ...novaPool]
        .filter((v, i, a) => a.findIndex(t => t.url === v.url) === i)
        .sort((a, b) => (a.latencia || 9999) - (b.latencia || 9999));

    salvarProxyPool(poolFinal);
    return novaPool.length;
}

// ─── websocket isolado por usuário ──────────────────────────
function broadcast(userId, tipo, dados) {
    const msg = JSON.stringify({ tipo, dados });
    wss.clients.forEach(ws => {
        if (ws.readyState === 1 && ws.userId === userId) {
            ws.send(msg);
        }
    });
}

wss.on('connection', (ws, req) => {
    // Extrair token da URL de conexão do websocket
    let token = null;
    try {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        token = urlParams.get('token');
    } catch {}

    const authData = verifyIframeToken(token);
    
    if (!authData) {
        ws.close();
        return;
    }
    
    const userId = authData.userId;
    ws.userId = userId;
    ws.plano = authData.plano;
    ws.send(JSON.stringify({ tipo: 'init', dados: { plano: authData.plano } }));
    ws.send(JSON.stringify({ tipo: 'numeros', dados: listarNumeros(userId) }));
    ws.send(JSON.stringify({ tipo: 'campanhas', dados: listarCampanhas(userId) }));
    ws.send(JSON.stringify({ tipo: 'disparos', dados: listarDisparos(userId) }));
});

// ─── utilitários ───────────────────────────────────────────
function delayGaussiano(min, max) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const media = (min + max) / 2;
    const sigma = (max - min) / 6;
    return Math.min(max, Math.max(min, Math.round(num * sigma + media)));
}

function sortearMensagem(variacoes, nome) {
    const idx = Math.floor(Math.random() * variacoes.length);
    return variacoes[idx].replace(/{nome}/g, nome || 'amigo');
}

async function gerarMensagemGPT(promptTemplate, nome, apiKey, model = 'gpt-4o-mini') {
    const p = promptTemplate.replace(/{nome}/g, nome || 'amigo');
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: p }],
                max_tokens: 150
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content.trim();
    } catch (err) {
        console.error('GPT error:', err.message);
        throw err;
    }
}

function dentroHorarioComercial(cfg) {
    if (!cfg.pausaInteligente) return true;
    const agora = new Date();
    const hora = agora.getHours();
    const dia = agora.getDay();
    const diasBloqueados = cfg.diasBloqueados || [0, 6];
    if (diasBloqueados.includes(dia)) return false;
    return hora >= (cfg.horaInicio || 8) && hora < (cfg.horaFim || 18);
}

function registrarLog(userId, disparoBaseId, entrada) {
    const arquivo = `./logs/${userId}_${disparoBaseId}.json`;
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(arquivo, 'utf-8')); } catch { /* arquivo não existe ainda */ }
    logs.unshift({ ...entrada, hora: new Date().toISOString() });
    fs.writeFileSync(arquivo, JSON.stringify(logs, null, 2));
    broadcast(userId, 'log', { disparoId: disparoBaseId, entrada: { ...entrada, hora: new Date().toISOString() } });
}

// ─── números / sessões isoladas ─────────────────────────────
function listarNumeros(userId) {
    return Object.entries(numeros)
        .filter(([id]) => id.startsWith(`${userId}_`))
        .map(([id, n]) => ({
            id: id.replace(`${userId}_`, ''), // Remove prefixo para o frontend
            status: n.status,
            numero: n.numero || null,
            nome: n.nome || null,
            qrCode: n.qrCode || null,
            proxy: n.proxy || null
        }));
}

function criarCliente(userId, baseId, proxyUrl) {
    const id = `${userId}_${baseId}`;
    
    const puppeteerArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-software-rasterizer',
        '--mute-audio',
        '--js-flags="--max-old-space-size=512"'
    ];

    const meta = metaSalva[id] || {};
    let finalProxy = proxyUrl || meta.proxy || null;

    if (finalProxy && !finalProxy.startsWith('http') && !finalProxy.startsWith('socks')) {
        finalProxy = 'http://' + finalProxy;
    }

    if (finalProxy) {
        console.log(`[PROXY] Iniciando cliente ${id} com proxy: ${finalProxy}`);
        puppeteerArgs.push(`--proxy-server=${finalProxy}`);
    } else {
        console.log(`[PROXY] Iniciando cliente ${id} sem proxy`);
    }

    // Remove ALL Chromium lock files recursively to prevent crash (Code 21) after Docker restart
    const sessionDir = path.join('./sessoes', `session-${id}`);
    function removeLockFilesRecursive(dir) {
        if (!fs.existsSync(dir)) return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    removeLockFilesRecursive(fullPath);
                } else if (entry.name.startsWith('Singleton')) {
                    try { fs.unlinkSync(fullPath); } catch (e) {}
                }
            }
        } catch (e) {}
    }
    removeLockFilesRecursive(sessionDir);

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: id, dataPath: './sessoes' }),
        puppeteer: {
            headless: true,
            args: puppeteerArgs
        }
    });

    numeros[id] = { 
        client, 
        status: 'iniciando', 
        qrCode: null, 
        numero: meta.numero || null, 
        nome: meta.nome || null,
        proxy: finalProxy
    };
    broadcast(userId, 'numeros', listarNumeros(userId));

    client.on('qr', async (qr) => {
        try {
            const qrImg = await qrcode.toDataURL(qr);
            numeros[id].status = 'aguardando_qr';
            numeros[id].qrCode = qrImg;
            broadcast(userId, 'numeros', listarNumeros(userId));
        } catch (err) {
            console.error('Erro ao gerar QR:', err.message);
        }
    });

    client.on('ready', async () => {
        try {
            const info = client.info;
            numeros[id].status = 'conectado';
            numeros[id].qrCode = null;
            numeros[id].numero = info.wid.user;
            numeros[id].nome = info.pushname;
            salvarMetadadosContas();
            broadcast(userId, 'numeros', listarNumeros(userId));
            console.log(`✅ Número conectado: +${info.wid.user}`);
        } catch (err) {
            console.error('Erro no ready:', err.message);
        }
    });

    client.on('auth_failure', () => {
        console.error(`❌ Falha de autenticação: ${id}`);
        numeros[id].status = 'desconectado';
        broadcast(userId, 'numeros', listarNumeros(userId));
    });

    client.on('disconnected', (reason) => {
        console.log(`⚠️ Desconectado (${id}): ${reason}`);
        numeros[id].status = 'desconectado';
        numeros[id].qrCode = null;
        broadcast(userId, 'numeros', listarNumeros(userId));
    });

    client.initialize().catch(err => {
        console.error(`Erro ao inicializar cliente ${id}:`, err.message);
        numeros[id].status = 'desconectado';
        broadcast(userId, 'numeros', listarNumeros(userId));
    });
}

// ─── campanhas isoladas ─────────────────────────────────────
function listarCampanhas(userId) {
    try {
        return fs.readdirSync('./contatos')
            .filter(f => f.startsWith(`${userId}_`) && f.endsWith('.json'))
            .map(f => {
                try {
                    const data = JSON.parse(fs.readFileSync(`./contatos/${f}`, 'utf-8'));
                    return { 
                        id: f.replace(`${userId}_`, '').replace('.json', ''), 
                        nome: data.nome, 
                        criado: data.criado, 
                        total: data.contatos.length 
                    };
                } catch { return null; }
            })
            .filter(Boolean);
    } catch { return []; }
}

function carregarCampanha(userId, baseId) {
    try { return JSON.parse(fs.readFileSync(`./contatos/${userId}_${baseId}.json`, 'utf-8')); }
    catch { return null; }
}

function salvarCampanha(userId, baseId, data) {
    fs.writeFileSync(`./contatos/${userId}_${baseId}.json`, JSON.stringify(data, null, 2));
    broadcast(userId, 'campanhas', listarCampanhas(userId));
}

function parsearContatos(texto) {
    return texto.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(l => {
            const partes = l.split(/[,;|\t]/);
            let numero = partes[0].replace(/\D/g, '');
            const nome = partes[1] ? partes[1].trim() : '';
            
            // Se for número BR sem DDI, adiciona 55
            if (numero.length >= 10 && numero.length <= 11 && !numero.startsWith('55')) {
                numero = '55' + numero;
            }
            
            return { numero, nome };
        })
        .filter(c => c.numero.length >= 12);
}

// Função para tentar achar o JID correto (trata o 9º dígito)
async function getCorrectJid(client, numero) {
    // 1. Tenta a função nativa do WWebJS
    try {
        const numberId = await client.getNumberId(numero);
        if (numberId && numberId._serialized) return numberId._serialized;
    } catch (e) {}

    // 2. Fallback: Checagem direta do número original
    try {
        const exists = await client.isRegisteredUser(`${numero}@c.us`);
        if (exists) return `${numero}@c.us`;
    } catch (e) {}

    // 3. Fallback: Lógica manual para Brasil (55)
    if (numero.startsWith('55')) {
        // Se tem 13 dígitos (com 9), tenta sem o 9
        if (numero.length === 13) {
            const semNove = numero.slice(0, 4) + numero.slice(5);
            try {
                const exists = await client.isRegisteredUser(`${semNove}@c.us`);
                if (exists) return `${semNove}@c.us`;
            } catch (e) {}
        } 
        // Se tem 12 dígitos (sem 9), tenta com o 9
        else if (numero.length === 12) {
            const comNove = numero.slice(0, 4) + '9' + numero.slice(4);
            try {
                const exists = await client.isRegisteredUser(`${comNove}@c.us`);
                if (exists) return `${comNove}@c.us`;
            } catch (e) {}
        }
    }

    return null;
}

// ─── disparos isolados ──────────────────────────────────────
function listarDisparos(userId) {
    return Object.entries(disparos)
        .filter(([id]) => id.startsWith(`${userId}_`))
        .map(([id, d]) => ({
            id: id.replace(`${userId}_`, ''),
            nome: d.nome, status: d.status,
            enviados: d.enviados, falhas: d.falhas,
            invalidos: d.invalidos, total: d.total,
            inicio: d.inicio,
            agendadoPara: d.agendadoPara,
            rotacaoAtiva: d.config?.rotacaoAtiva !== false
        }));
}

async function executarDisparo(userId, baseId, plano) {
    const id = `${userId}_${baseId}`;
    const d = disparos[id];
    if (!d) return;

    d.status = 'rodando';
    d.inicio = new Date().toISOString();
    broadcast(userId, 'disparos', listarDisparos(userId));

    const cfg = d.config;
    const campanha = carregarCampanha(userId, cfg.campanhaId);
    if (!campanha) {
        d.status = 'erro';
        d.erro = 'Campanha deletada ou não encontrada';
        broadcast(userId, 'disparos', listarDisparos(userId));
        return;
    }

    const contatos = campanha.contatos;
    let msgsNoNumero = 0;
    let msgsEnviadasTotal = 0; // Para controle de pausa automática

    for (let i = 0; i < contatos.length; i++) {
        if (d.status === 'parado') break;

        // pausar se solicitado
        while (d.status === 'pausado') {
            if (d.status === 'parado') break;
            await new Promise(r => setTimeout(r, 5000));
        }
        if (d.status === 'parado') break;

        // Pausa Automática (Cooldown)
        if (cfg.pausaAtiva && msgsEnviadasTotal > 0 && msgsEnviadasTotal % cfg.pausaCada === 0) {
            console.log(`⏳ Pausa automática atingida (${cfg.pausaCada} msgs). Aguardando ${cfg.pausaTempo} min...`);
            registrarLog(userId, baseId, {
                numero: '-', nome: 'SISTEMA', status: 'info',
                mensagem: `Pausa automática: aguardando ${cfg.pausaTempo} min...`,
                numeroUsado: '-'
            });
            await new Promise(r => setTimeout(r, cfg.pausaTempo * 60000));
        }

        const contato = contatos[i];

        // rotação inteligente de números do usuário
        const baseNumerosAtivos = (cfg.numerosIds || []);
        let clienteId = null;
        let client = null;

        // Escolher número conectado mais adequado
        const rotAtiva = d.config?.rotacaoAtiva !== false;

        if (rotAtiva) {
            const conectados = baseNumerosAtivos
                .map(nid => `${userId}_${nid}`)
                .filter(fullId => numeros[fullId]?.status === 'conectado');
            if (!conectados.length) {
                d.status = 'pausado';
                broadcast(userId, 'disparos', listarDisparos(userId));
                i--; // repete esse contato depois
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            const rotaMuda = cfg.mensagensPorNumero || 10;
            const idxNum = Math.floor(msgsNoNumero / rotaMuda) % conectados.length;
            clienteId = conectados[idxNum];
            client = numeros[clienteId].client;
        } else {
            // Usa o primeiro conectado disponível
            const primeiroOn = baseNumerosAtivos
                .map(nid => `${userId}_${nid}`)
                .find(fullId => numeros[fullId]?.status === 'conectado');
            if (!primeiroOn) {
                d.status = 'pausado';
                broadcast(userId, 'disparos', listarDisparos(userId));
                i--;
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }
            clienteId = primeiroOn;
            client = numeros[clienteId].client;
        }

        try {
            // inteligente: verificar se número possui WhatsApp (trata 9º dígito)
            const chatId = await getCorrectJid(client, contato.numero);
            
            if (!chatId) {
                d.invalidos++;
                registrarLog(userId, baseId, {
                    numero: contato.numero,
                    nome: contato.nome || '-',
                    status: 'invalido',
                    mensagem: 'Número não existe no WhatsApp',
                    numeroUsado: numeros[clienteId]?.numero || clienteId.replace(`${userId}_`, '')
                });
                broadcast(userId, 'disparos', listarDisparos(userId));
                continue;
            }

            const finalNumber = chatId.split('@')[0]; // Número real encontrado

            // obter nome do contato
            let nomeContato = contato.nome;
            if (!nomeContato) {
                try {
                    const contact = await client.getContactById(chatId).catch(() => null);
                    if (contact) {
                        nomeContato = contact.name || contact.pushname || 'amigo';
                    } else {
                        nomeContato = 'amigo';
                    }
                } catch {
                    nomeContato = 'amigo';
                }
            }

            // gerar mensagem
            let mensagem;
            if (cfg.usarGPT && cfg.gptKey && cfg.gptPrompt) {
                try {
                    mensagem = await gerarMensagemGPT(cfg.gptPrompt, nomeContato, cfg.gptKey, cfg.gptModel);
                } catch {
                    mensagem = sortearMensagem(cfg.variacoes || ['Olá {nome}!'], nomeContato);
                }
            } else {
                mensagem = sortearMensagem(cfg.variacoes || ['Olá {nome}!'], nomeContato);
            }

            // simular digitação (opcional e seguro)
            try {
                await client.sendPresenceAvailable();
                // Tenta simular digitação, mas não trava se der erro de LID
                client.sendPresenceUpdate('composing', chatId).catch(() => {});
                await new Promise(r => setTimeout(r, delayGaussiano(1000, 2500)));
            } catch {}

            // verificar limite diário (plano free)
            if (!registrarEnvio(userId, plano)) {
                d.status = 'erro';
                d.erro = 'Limite de 50 envios diários atingido no Plano Grátis. Faça upgrade!';
                broadcast(userId, 'disparos', listarDisparos(userId));
                break;
            }

            // enviar mensagem (Usa o método direto para evitar erros de cache de chat)
            if (cfg.midia && cfg.midia.data) {
                const media = new MessageMedia(
                    cfg.midia.mimetype,
                    cfg.midia.data,
                    cfg.midia.filename
                );
                await client.sendMessage(chatId, media, { caption: mensagem });
            } else {
                await client.sendMessage(chatId, mensagem);
            }

            d.enviados++;
            msgsNoNumero++;
            msgsEnviadasTotal++;
            registrarLog(userId, baseId, {
                numero: finalNumber,
                nome: nomeContato,
                status: 'enviado',
                mensagem,
                numeroUsado: numeros[clienteId]?.numero || clienteId.replace(`${userId}_`, '')
            });
            broadcast(userId, 'disparos', listarDisparos(userId));

            // delay após envio
            if (i < contatos.length - 1) {
                await new Promise(r => setTimeout(r, cfg.delayAposEnvio || 5000));
            }

        } catch (err) {
            d.falhas++;
            console.error(`Erro ao enviar para ${contato.numero}:`, err.message);
            registrarLog(userId, baseId, {
                numero: contato.numero,
                nome: contato.nome || '-',
                status: 'erro',
                mensagem: err.message,
                numeroUsado: numeros[clienteId]?.numero || clienteId.replace(`${userId}_`, '')
            });
            broadcast(userId, 'disparos', listarDisparos(userId));
        }

        // delay entre mensagens (se rodando)
        if (i < contatos.length - 1 && d.status === 'rodando') {
            const delay = delayGaussiano(
                cfg.delayMin || 8000,
                cfg.delayMax || 12000
            );
            await new Promise(r => setTimeout(r, delay));
        }
    }

    if (d.status !== 'parado') {
        d.status = 'concluido';
    }
    broadcast(userId, 'disparos', listarDisparos(userId));
    broadcast(userId, 'disparo_concluido', {
        disparoId: baseId,
        nome: d.nome,
        enviados: d.enviados,
        falhas: d.falhas,
        invalidos: d.invalidos
    });
    console.log(`✅ Disparo concluído: ${d.nome} — ${d.enviados} enviados, ${d.falhas} falhas`);
}

// ─── rotas: números isolados ───────────────────────────────
app.get('/api/numeros', (req, res) => res.json(listarNumeros(req.userId)));

app.post('/api/numeros', (req, res) => {
    const limites = getLimites(req.plano);
    const contas = listarNumeros(req.userId);
    if (contas.length >= limites.conexoes) {
        return res.status(403).json({ erro: `Seu plano permite no máximo ${limites.conexoes} conexão(es). Faça upgrade!` });
    }
    let proxy = req.body.proxy;
    if (req.body.usarPool) {
        const pool = carregarProxyPool();
        if (pool.length > 0) {
            const sorteado = pool[Math.floor(Math.random() * pool.length)];
            proxy = sorteado.url;
        }
    }

    const baseId = 'num_' + Date.now();
    const fullId = `${req.userId}_${baseId}`;
    
    // Salvar proxy imediatamente para persistência
    metaSalva[fullId] = { proxy };
    salvarMetadadosContas();

    criarCliente(req.userId, baseId, proxy);
    res.json({ id: baseId });
});

app.delete('/api/numeros/:id', async (req, res) => {
    const id = `${req.userId}_${req.params.id}`;
    if (numeros[id]) {
        try { await numeros[id].client.destroy(); } catch { /* ignorar */ }
        delete numeros[id];
        
        // Deletar a pasta da sessão para não recarregar no restart
        const sessionPath = `./sessoes/session-${id}`;
        if (fs.existsSync(sessionPath)) {
            try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch {}
        }
        
        broadcast(req.userId, 'numeros', listarNumeros(req.userId));
    }
    res.json({ ok: true });
});

// ─── rotas: campanhas isoladas ─────────────────────────────
app.get('/api/campanhas', (req, res) => res.json(listarCampanhas(req.userId)));

app.post('/api/campanhas', (req, res) => {
    const { nome, texto } = req.body;
    if (!nome || !texto) return res.status(400).json({ erro: 'Nome e contatos são obrigatórios' });
    const baseId = nome.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const contatos = parsearContatos(texto);
    if (!contatos.length) return res.status(400).json({ erro: 'Nenhum contato válido encontrado' });
    salvarCampanha(req.userId, baseId, { nome, criado: new Date().toISOString(), contatos });
    res.json({ id: baseId, total: contatos.length });
});

app.get('/api/campanhas/:id', (req, res) => {
    const campanha = carregarCampanha(req.userId, req.params.id);
    if (!campanha) return res.status(404).json({ erro: 'Lista não encontrada' });
    res.json(campanha);
});

app.delete('/api/campanhas/:id', (req, res) => {
    const baseId = req.params.id;
    try {
        fs.unlinkSync(`./contatos/${req.userId}_${baseId}.json`);
        broadcast(req.userId, 'campanhas', listarCampanhas(req.userId));
        res.json({ ok: true });
    } catch (err) {
        res.status(404).json({ erro: 'Campanha não encontrada' });
    }
});

// ─── rotas: disparos isolados ──────────────────────────────
app.get('/api/disparos', (req, res) => res.json(listarDisparos(req.userId)));

app.post('/api/disparos', (req, res) => {
    const cfg = req.body;
    if (!cfg.campanhaId) return res.status(400).json({ erro: 'Campanha obrigatória' });
    if (!cfg.numerosIds || !cfg.numerosIds.length) return res.status(400).json({ erro: 'Selecione pelo menos um número' });

    const campanha = carregarCampanha(req.userId, cfg.campanhaId);
    if (!campanha) return res.status(404).json({ erro: 'Campanha não encontrada' });

    const numerosConectados = (cfg.numerosIds || []).filter(baseId => {
        const fullId = `${req.userId}_${baseId}`;
        return numeros[fullId]?.status === 'conectado';
    });
    if (!numerosConectados.length) return res.status(400).json({ erro: 'Nenhum número selecionado está conectado' });

    const baseId = 'disparo_' + Date.now();
    const fullId = `${req.userId}_${baseId}`;
    
    disparos[fullId] = {
        id: fullId,
        nome: cfg.nome || 'Disparo ' + new Date().toLocaleString('pt-BR'),
        config: cfg,
        status: cfg.agendadoPara ? 'agendado' : 'aguardando',
        enviados: 0,
        falhas: 0,
        invalidos: 0,
        total: campanha.contatos.length,
        inicio: null,
        agendadoPara: cfg.agendadoPara || null
    };
    broadcast(req.userId, 'disparos', listarDisparos(req.userId));

    if (cfg.agendadoPara) {
        const delay = cfg.agendadoPara - Date.now();
        if (delay > 0) {
            console.log(`⏰ Disparo ${fullId} agendado para daqui a ${Math.round(delay/1000/60)} minutos`);
            setTimeout(() => {
                if (disparos[fullId] && disparos[fullId].status === 'agendado') {
                    executarDisparo(req.userId, baseId, req.plano).catch(console.error);
                }
            }, delay);
            return res.json({ id: baseId, agendado: true });
        }
    }

    executarDisparo(req.userId, baseId, req.plano).catch(err => {
        console.error('Erro no disparo:', err);
        if (disparos[fullId]) {
            disparos[fullId].status = 'erro';
            disparos[fullId].erro = err.message;
            broadcast(req.userId, 'disparos', listarDisparos(req.userId));
        }
    });

    res.json({ id: baseId, total: campanha.contatos.length });
});

app.post('/api/disparos/pausar-todos', (req, res) => {
    const userId = req.userId;
    const prefix = `${userId}_`;
    let count = 0;
    
    // Pausar disparos
    Object.keys(disparos).forEach(id => {
        if (id.startsWith(prefix) && disparos[id].status === 'rodando') {
            disparos[id].status = 'pausado';
            count++;
        }
    });
    
    // Pausar adições de membros
    if (addGruposStatus[userId] && addGruposStatus[userId].status === 'rodando') {
        addGruposStatus[userId].status = 'pausado';
        count++;
    }

    // Pausar envio para grupos
    if (envioGruposStatus[userId] && envioGruposStatus[userId].status === 'rodando') {
        envioGruposStatus[userId].status = 'pausado';
        count++;
    }

    // Pausar limpeza de lista
    if (limpezaStatus[userId] && limpezaStatus[userId].status === 'rodando') {
        limpezaStatus[userId].status = 'pausado';
        count++;
    }

    broadcast(userId, 'disparos', listarDisparos(userId));
    res.json({ ok: true, count });
});

app.post('/api/disparos/retomar-todos', (req, res) => {
    const userId = req.userId;
    const prefix = `${userId}_`;
    let count = 0;
    
    // Retomar disparos
    Object.keys(disparos).forEach(id => {
        if (id.startsWith(prefix) && disparos[id].status === 'pausado') {
            disparos[id].status = 'rodando';
            count++;
        }
    });
    
    // Retomar adições de membros
    if (addGruposStatus[userId] && addGruposStatus[userId].status === 'pausado') {
        addGruposStatus[userId].status = 'rodando';
        count++;
    }

    // Retomar envio para grupos
    if (envioGruposStatus[userId] && envioGruposStatus[userId].status === 'pausado') {
        envioGruposStatus[userId].status = 'rodando';
        count++;
    }

    // Retomar limpeza de lista
    if (limpezaStatus[userId] && limpezaStatus[userId].status === 'pausado') {
        limpezaStatus[userId].status = 'rodando';
        count++;
    }

    broadcast(userId, 'disparos', listarDisparos(userId));
    res.json({ ok: true, count });
});

app.post('/api/disparos/parar-todos', (req, res) => {
    const userId = req.userId;
    const prefix = `${userId}_`;
    let count = 0;
    
    // Parar disparos
    Object.keys(disparos).forEach(id => {
        if (id.startsWith(prefix) && (disparos[id].status === 'rodando' || disparos[id].status === 'pausado' || disparos[id].status === 'aguardando')) {
            disparos[id].status = 'parado';
            count++;
        }
    });
    
    // Parar adições de membros
    if (addGruposStatus[userId] && (addGruposStatus[userId].status === 'rodando' || addGruposStatus[userId].status === 'pausado')) {
        addGruposStatus[userId].status = 'parado';
        count++;
    }

    // Parar envio para grupos
    if (envioGruposStatus[userId] && (envioGruposStatus[userId].status === 'rodando' || envioGruposStatus[userId].status === 'pausado')) {
        envioGruposStatus[userId].status = 'parado';
        count++;
    }

    // Parar limpeza de lista
    if (limpezaStatus[userId] && (limpezaStatus[userId].status === 'rodando' || limpezaStatus[userId].status === 'pausado')) {
        limpezaStatus[userId].status = 'parado';
        count++;
    }

    broadcast(userId, 'disparos', listarDisparos(userId));
    res.json({ ok: true, count });
});

app.post('/api/disparos/:id/pausar', (req, res) => {
    const fullId = `${req.userId}_${req.params.id}`;
    const d = disparos[fullId];
    if (!d) return res.status(404).json({ erro: 'Disparo não encontrado' });
    if (d.status === 'rodando') {
        d.status = 'pausado';
        broadcast(req.userId, 'disparos', listarDisparos(req.userId));
    }
    res.json({ ok: true, status: d.status });
});

app.post('/api/disparos/:id/retomar', (req, res) => {
    const fullId = `${req.userId}_${req.params.id}`;
    const d = disparos[fullId];
    if (!d) return res.status(404).json({ erro: 'Disparo não encontrado' });
    if (d.status === 'pausado') {
        d.status = 'rodando';
        broadcast(req.userId, 'disparos', listarDisparos(req.userId));
    }
    res.json({ ok: true, status: d.status });
});

app.post('/api/disparos/:id/parar', (req, res) => {
    const fullId = `${req.userId}_${req.params.id}`;
    const d = disparos[fullId];
    if (!d) return res.status(404).json({ erro: 'Disparo não encontrado' });
    d.status = 'parado';
    broadcast(req.userId, 'disparos', listarDisparos(req.userId));
    res.json({ ok: true });
});

app.post('/api/disparos/:id/rotacao', (req, res) => {
    const fullId = `${req.userId}_${req.params.id}`;
    const d = disparos[fullId];
    if (!d) return res.status(404).json({ erro: 'Disparo não encontrado' });
    d.config.rotacaoAtiva = req.body.ativa !== false;
    broadcast(req.userId, 'disparos', listarDisparos(req.userId));
    res.json({ ok: true, rotacaoAtiva: d.config.rotacaoAtiva });
});

// ─── rotas: grupos e extração ──────────────────────────────
app.get('/api/grupos/:numeroId', async (req, res) => {
    const fullId = `${req.userId}_${req.params.numeroId}`;
    const n = numeros[fullId];
    if (!n || n.status !== 'conectado') return res.status(404).json({ erro: 'Número não conectado' });
    
    try {
        console.log(`[GRUPOS] Solicitando lista para ${fullId}...`);
        
        // Timeout maior para leitura de grupos (45s)
        const grupos = await Promise.race([
            n.client.getChats().then(chats => {
                return chats
                    .filter(c => c && c.isGroup)
                    .map(g => ({
                        id: g.id?._serialized || '',
                        nome: g.name || 'Sem nome',
                        participantes: (g.groupMetadata?.participants?.length) || 0
                    }));
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 45000))
        ]);

        console.log(`[GRUPOS] ${grupos.length} grupos encontrados para ${fullId}`);
        res.json(grupos);
    } catch (err) {
        console.error(`[GRUPOS-ERRO] ${fullId}:`, err.message);
        if (err.message === 'TIMEOUT') {
            return res.status(504).json({ erro: 'O WhatsApp demorou muito para responder. Tente novamente em instantes.' });
        }
        res.status(500).json({ erro: 'Falha ao buscar grupos: ' + err.message });
    }
});

app.get('/api/grupos/:numeroId/:grupoId/membros', async (req, res) => {
    const fullId = `${req.userId}_${req.params.numeroId}`;
    const n = numeros[fullId];
    if (!n || n.status !== 'conectado') return res.status(404).json({ erro: 'Número não conectado' });
    try {
        const chat = await n.client.getChatById(req.params.grupoId);
        if (!chat.isGroup) return res.status(400).json({ erro: 'O chat selecionado não é um grupo' });
        
        const parts = chat.participants || [];
        
        if (parts.length === 0) {
            return res.status(400).json({ erro: 'Grupo fechado, comunidade ou sem permissão para ler participantes.' });
        }

        // Puxa contatos para tentar pegar os nomes salvos ou do perfil do whatsapp (pushname)
        let contatos = [];
        try { contatos = await n.client.getContacts(); } catch(e){}
        const mapaNomes = new Map();
        contatos.forEach(c => {
            if (c.number) mapaNomes.set(c.number, c.name || c.pushname || '');
        });

        const participantes = parts.map(p => ({
            numero: p.id?.user || '',
            nome: mapaNomes.get(p.id?.user) || '',
            isAdmin: p.isAdmin || p.isSuperAdmin || false
        })).filter(p => p.numero && !p.isAdmin);

        res.json(participantes);
    } catch (err) {
        console.error('Erro na extração de membros:', err);
        res.status(500).json({ erro: err.message });
    }
});

app.post('/api/grupos/enviar', async (req, res) => {
    const { numeroId, grupoId, mensagem, midia } = req.body;
    const fullId = `${req.userId}_${numeroId}`;
    const n = numeros[fullId];
    if (!n || n.status !== 'conectado') return res.status(404).json({ erro: 'Número não conectado' });
    try {
        if (midia && midia.data) {
            const media = new MessageMedia(midia.mimetype, midia.data, midia.filename);
            await n.client.sendMessage(grupoId, media, { caption: mensagem });
        } else {
            await n.client.sendMessage(grupoId, mensagem);
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ─── envio em massa para grupos ─────────────────────────
app.post('/api/grupos/enviar-massa', async (req, res) => {
    const { numerosIds, gruposIds, variacoes, usarGPT, gptKey, gptPrompt, midia, delayMin, delayMax, pausaAtiva, pausaCada, pausaTempo, agendadoPara, trocaApos } = req.body;
    const userId = req.userId;
    
    if (!numerosIds || !numerosIds.length || !gruposIds || !gruposIds.length) {
        return res.status(400).json({ erro: 'Selecione emissores e grupos' });
    }
    
    const limites = getLimites(req.plano);
    if (usarGPT && !limites.gpt) {
        return res.status(403).json({ erro: 'ChatGPT é exclusivo do plano General das Vendas (anual). Faça upgrade!' });
    }
    
    const chipsConectados = numerosIds.filter(id => {
        const full = `${req.userId}_${id}`;
        return numeros[full] && numeros[full].status === 'conectado';
    });

    if (chipsConectados.length === 0) {
        return res.status(404).json({ erro: 'Nenhum dos números selecionados está conectado.' });
    }

    envioGruposStatus[userId] = { status: 'rodando', total: gruposIds.length, atual: 0, enviados: 0, falhas: 0 };

    // Função de execução
    const executarEnvioMassa = async () => {
        const job = envioGruposStatus[userId];
        let indiceAtual = 0;      // Fix #21: declaração que estava faltando
        let contadorTroca = 0;    // Fix #21: declaração que estava faltando
        let enviados = 0;
        let falhas = 0;
        for (let i = 0; i < gruposIds.length; i++) {
            if (job.status === 'parado') break;
            while (job.status === 'pausado') {
                if (job.status === 'parado') break;
                await new Promise(r => setTimeout(r, 2000));
            }
            if (job.status === 'parado') break;

            // Selecionar cliente atual da rotação
            let currentNumId = numerosIds[indiceAtual];
            let fullId = `${userId}_${currentNumId}`;
            let n = numeros[fullId];

            // Busca chip disponível
            let tentativas = 0;
            while ((!n || n.status !== 'conectado') && tentativas < numerosIds.length) {
                indiceAtual = (indiceAtual + 1) % numerosIds.length;
                currentNumId = numerosIds[indiceAtual];
                fullId = `${userId}_${currentNumId}`;
                n = numeros[fullId];
                tentativas++;
            }

            if (!n || n.status !== 'conectado') {
                falhas++;
                console.error(`❌ Nenhum chip disponível para envio no grupo ${gruposIds[i]}`);
            } else {
                try {
                    let mensagem;
                    if (usarGPT && gptKey && gptPrompt) {
                        mensagem = await gerarMensagemGPT(gptPrompt, '', gptKey, req.body.gptModel);
                    } else if (variacoes && variacoes.length) {
                        mensagem = variacoes[Math.floor(Math.random() * variacoes.length)];
                    } else {
                        mensagem = '';
                    }
                    
                    if (midia && midia.data) {
                        const media = new MessageMedia(midia.mimetype, midia.data, midia.filename);
                        await n.client.sendMessage(gruposIds[i], media, { caption: mensagem });
                    } else {
                        await n.client.sendMessage(gruposIds[i], mensagem);
                    }
                    enviados++;
                    contadorTroca++;
                    console.log(`✉️ Grupo ${i+1}/${gruposIds.length} enviado via ${currentNumId}`);
                } catch (err) {
                    falhas++;
                    console.error(`❌ Erro no grupo ${gruposIds[i]}:`, err.message);
                }
            }

            // Enviar progresso via WS (Sempre envia após tentativa)
            job.atual = i + 1;
            job.enviados = enviados;
            job.falhas = falhas;
            broadcast(userId, 'progresso_grupos', job);
            
            // Lógica de Rotação
            if (contadorTroca >= (trocaApos || 5) && numerosIds.length > 1) {
                indiceAtual = (indiceAtual + 1) % numerosIds.length;
                contadorTroca = 0;
                console.log(`🔄 Rotação Envio Grupos: trocando para o número ${numerosIds[indiceAtual]}`);
            }
            
            // Delay entre envios
            if (i < gruposIds.length - 1) {
                const delay = delayGaussiano(delayMin || 5000, delayMax || 15000);
                await new Promise(r => setTimeout(r, delay));
            }
            
            // Pausa automática
            if (pausaAtiva && (enviados) % (pausaCada || 5) === 0 && enviados > 0 && i < gruposIds.length - 1) {
                const pausaMs = (pausaTempo || 2) * 60000;
                console.log(`⏸️ Pausa de ${pausaTempo} min após ${enviados} envios`);
                const tempoRestante = pausaMs;
                const slice = 5000;
                for(let t=0; t<tempoRestante; t+=slice) {
                    if (job.status === 'parado' || job.status === 'pausado') break;
                    await new Promise(r => setTimeout(r, slice));
                }
            }
        }
        job.status = job.status === 'parado' ? 'parado' : 'concluido';
        console.log(`✅ Envio em massa finalizado para usuário ${userId} com status: ${job.status}`);
        
        // Salvar Relatório
        const logId = `grupos_${Date.now()}`;
        const logData = {
            id: logId,
            nome: `Envio Grupos - ${new Date().toLocaleString('pt-BR')}`,
            data: new Date().toISOString(),
            status: 'concluido',
            enviados,
            falhas,
            total: gruposIds.length,
            entradas: [] // Opcional: detalhar cada grupo se necessário
        };
        fs.writeFileSync(`./logs/${userId}_${logId}.json`, JSON.stringify(logData, null, 2));
        broadcast(userId, 'disparos', listarDisparos(userId)); // Atualiza lista para incluir novo log
    };

    // Agendamento ou Execução Imediata
    if (agendadoPara) {
        const delay = agendadoPara - Date.now();
        if (delay > 0) {
            setTimeout(() => executarEnvioMassa().catch(e => console.error('Erro agendamento grupos:', e)), delay);
        } else {
            executarEnvioMassa().catch(e => console.error('Erro envio imediato grupos:', e));
        }
    } else {
        executarEnvioMassa().catch(e => console.error('Erro envio imediato grupos:', e));
    }
});

function salvarRelatorioAdd(job, userId) {
    const logId = `add_${Date.now()}`;
    const logData = {
        id: logId,
        nome: `Adição Grupos - ${new Date().toLocaleString('pt-BR')}`,
        data: new Date().toISOString(),
        status: job.status,
        total: job.total,
        enviados: job.resultados.filter(r => r.status === 'adicionado').length,
        falhas: job.resultados.filter(r => r.status === 'erro').length,
        entradas: job.resultados.map(r => ({
            numero: r.numero,
            status: r.status,
            mensagem: r.msg || (r.status === 'adicionado' ? 'Sucesso' : 'Erro')
        }))
    };
    fs.writeFileSync(`./logs/${userId}_${logId}.json`, JSON.stringify(logData, null, 2));
}

app.post('/api/grupos/adicionar', async (req, res) => {
    const { numerosIds, grupoId, contatos, delayMs, trocaApos } = req.body;
    const userId = req.userId;
    
    if (!numerosIds || !numerosIds.length) return res.status(400).json({ erro: 'Nenhum número remetente selecionado' });

    addGruposStatus[userId] = {
        status: 'rodando',
        total: contatos.length,
        atual: 0,
        resultados: []
    };

    // Função interna para rodar em background
    const executarBackgroundAdd = async () => {
        const job = addGruposStatus[userId];
        const isBrutal = req.body.brutal; // Captura estável
        let indiceAtual = 0;
        let contadorTroca = 0;

        // --- MODO BRUTAL (ADICIONAR EM MICRO-LOTES RÁPIDOS) ---
        if (isBrutal) {
            console.log(`[BRUTAL] Iniciando adição em massa (lotes de 5) para usuário ${userId}`);
            let currentNumId = numerosIds[0];
            let fullId = `${userId}_${currentNumId}`;
            let n = numeros[fullId];

            if (!n || n.status !== 'conectado') {
                job.status = 'erro';
                broadcast(userId, 'progresso_add_grupos', job);
                return;
            }

            try {
                // Resolução paralela de JIDs reais (evita erro 400 por número inválido)
                console.log(`[BRUTAL] Resolvendo ${contatos.length} JIDs em paralelo...`);
                const jidResults = await Promise.all(
                    contatos.map(async num => {
                        try {
                            const jid = await getCorrectJid(n.client, num);
                            return jid || null;
                        } catch { return null; }
                    })
                );
                const jids = jidResults.filter(j => j !== null);
                console.log(`[BRUTAL] ${jids.length} números válidos de ${contatos.length}. Iniciando adição em lotes...`);

                if (jids.length > 0) {
                    const chat = await n.client.getChatById(grupoId);
                    
                    for (let k = 0; k < jids.length; k += 5) {
                        const chunk = jids.slice(k, k + 5);
                        console.log(`[BRUTAL] Lote ${Math.floor(k/5)+1}/${Math.ceil(jids.length/5)} - Enviando ${chunk.length} membros...`);
                        
                        try {
                            const resAdd = await chat.addParticipants(chunk);
                            if (resAdd && typeof resAdd === 'object') {
                                Object.keys(resAdd).forEach(jid => {
                                    const num = jid.split('@')[0];
                                    const code = resAdd[jid].code;
                                    console.log(`[BRUTAL-RES] Número ${num}: Status ${code}`);
                                    job.resultados.push({ 
                                        numero: num, 
                                        status: code === 200 ? 'adicionado' : 'erro',
                                        msg: code === 200 ? 'Sucesso' : `Erro ${code}`
                                    });
                                });
                            }
                        } catch (e) {
                            console.error(`[BRUTAL] Falha no lote ${k}:`, e.message);
                        }
                        
                        job.atual = Math.min(k + 5, jids.length);
                        broadcast(userId, 'progresso_add_grupos', job);
                        await new Promise(r => setTimeout(r, 800));
                    }
                }
            } catch (err) {
                console.error('[BRUTAL-ERRO]', err.message);
                job.resultados.push({ numero: 'GERAL', status: 'erro', msg: err.message });
            }
            job.status = 'concluido';
            broadcast(userId, 'progresso_add_grupos', job);
            salvarRelatorioAdd(job, userId);
            return;
        }

        // --- MODO NORMAL (SEQUENCIAL COM DELAY) ---
        for (let i = 0; i < contatos.length; i++) {
            // Verificar se foi parado ou pausado
            if (job.status === 'parado') break;
            while (job.status === 'pausado') {
                if (job.status === 'parado') break;
                await new Promise(r => setTimeout(r, 2000));
            }
            if (job.status === 'parado') break;

            const numero = contatos[i];
            
            // Selecionar cliente atual da rotação
            let currentNumId = numerosIds[indiceAtual];
            let fullId = `${userId}_${currentNumId}`;
            let n = numeros[fullId];

            // Busca chip disponível
            let tentativas = 0;
            while ((!n || n.status !== 'conectado') && tentativas < numerosIds.length) {
                indiceAtual = (indiceAtual + 1) % numerosIds.length;
                currentNumId = numerosIds[indiceAtual];
                fullId = `${userId}_${currentNumId}`;
                n = numeros[fullId];
                tentativas++;
            }

            if (!n || n.status !== 'conectado') {
                job.resultados.push({ numero, status: 'erro', msg: 'Sem chip disponível' });
            } else {
                try {
                    // Validar número e resolver JID
                    const jid = await getCorrectJid(n.client, numero);
                    if (!jid) {
                        job.resultados.push({ numero, status: 'erro', msg: 'Sem WhatsApp' });
                    } else {
                        const chat = await n.client.getChatById(grupoId);
                        const resAdd = await chat.addParticipants([jid]);
                        const statusRes = resAdd ? resAdd[jid] : null;
                        
                        if (statusRes && statusRes.code !== 200) {
                            let motivo = 'Erro';
                            if (statusRes.code === 403) motivo = 'Privacidade';
                            else if (statusRes.code === 408) motivo = 'Saiu recentemente';
                            else if (statusRes.code === 409) motivo = 'Já no grupo';
                            else motivo = `Erro ${statusRes.code}`;
                            job.resultados.push({ numero, status: 'erro', msg: motivo });
                        } else {
                            job.resultados.push({ numero, status: 'adicionado' });
                            contadorTroca++;
                        }
                    }
                } catch (err) {
                    job.resultados.push({ numero, status: 'erro', msg: 'Restrição' });
                }
            }

            job.atual = i + 1;
            broadcast(userId, 'progresso_add_grupos', job);

            if (contadorTroca >= (trocaApos || 5)) {
                indiceAtual = (indiceAtual + 1) % numerosIds.length;
                contadorTroca = 0;
            }

            if (i < contatos.length - 1) {
                await new Promise(r => setTimeout(r, delayMs || 3000));
            }
        }
        job.status = job.status === 'parado' ? 'parado' : 'concluido';
        broadcast(userId, 'progresso_add_grupos', job);
        salvarRelatorioAdd(job, userId);
    };

    const { agendadoPara } = req.body;
    if (agendadoPara) {
        const delay = agendadoPara - Date.now();
        if (delay > 0) {
            setTimeout(() => executarBackgroundAdd().catch(err => console.error('Erro agendamento add:', err)), delay);
            return res.json({ ok: true, msg: 'Adição agendada com sucesso.' });
        }
    }

    executarBackgroundAdd().catch(err => console.error('Erro background add grupos:', err));
    res.json({ ok: true, msg: 'Processo de adição iniciado.' });
});

app.post('/api/listas/verificar', async (req, res) => {
    const { numerosIds, contatos } = req.body;
    if (!numerosIds || !numerosIds.length) return res.status(400).json({ erro: 'Selecione um número remetente.' });
    if (!contatos || !contatos.length) return res.status(400).json({ erro: 'Lista de contatos vazia.' });

    let n = null;
    for (const numId of numerosIds) {
        const fullId = `${req.userId}_${numId}`;
        if (numeros[fullId]?.status === 'conectado') {
            n = numeros[fullId];
            break;
        }
    }
    if (!n) return res.status(400).json({ erro: 'Nenhum número remetente conectado.' });

    // Iniciar background job para evitar timeout na API
    limpezaStatus[userId] = { status: 'rodando', total: contatos.length, atual: 0, validos: 0, invalidos: 0 };

    const executarVerificacao = async () => {
        const job = limpezaStatus[userId];
        try {
            console.log(`[VERIFICAR] Validando ${contatos.length} números sequencialmente...`);
            const validos = [];
            const invalidos = [];
            
            for (let i = 0; i < contatos.length; i++) {
                if (job.status === 'parado') break;
                while (job.status === 'pausado') {
                    if (job.status === 'parado') break;
                    await new Promise(r => setTimeout(r, 2000));
                }
                if (job.status === 'parado') break;

                const numero = contatos[i];
                try {
                    const jid = await getCorrectJid(n.client, numero);
                    if (jid) validos.push(numero);
                    else invalidos.push(numero);
                } catch (e) {
                    invalidos.push(numero);
                }
                
                // Enviar progresso via WebSocket
                if (i % 2 === 0 || i === contatos.length - 1) {
                    job.atual = i + 1;
                    job.validos = validos.length;
                    job.invalidos = invalidos.length;
                    broadcast(req.userId, 'progresso_limpeza', job);
                }
                
                await new Promise(r => setTimeout(r, 200)); // Delay p/ evitar Rate Limit
            }
            
            // Finalizado
            job.status = job.status === 'parado' ? 'parado' : 'concluido';
            broadcast(req.userId, 'limpeza_concluida', { total: contatos.length, validos, invalidos, status: job.status });
            console.log(`[VERIFICAR] Concluído com status ${job.status}: ${validos.length} Válidos, ${invalidos.length} Inválidos`);
        } catch (err) {
            console.error('[VERIFICAR] Erro no background:', err.message);
            job.status = 'erro';
            broadcast(req.userId, 'limpeza_erro', { erro: err.message });
        }
    };

    executarVerificacao();
});

app.get('/api/extracao/agenda/:numeroId', async (req, res) => {
    const fullId = `${req.userId}_${req.params.numeroId}`;
    const n = numeros[fullId];
    if (!n || n.status !== 'conectado') return res.status(404).json({ erro: 'Número não conectado' });
    try {
        const contatos = await n.client.getContacts();
        const lista = contatos
            .filter(c => c.isMyContact && (c.number || (c.id && c.id.user)))
            .map(c => ({ numero: c.number || c.id.user, nome: c.name || c.pushname || 'Contato' }));
        res.json(lista);
    } catch (err) {
        console.error('[EXTRAIR AGENDA] Erro:', err);
        res.status(500).json({ erro: err.message || 'Erro interno ao extrair contatos' });
    }
});

app.get('/api/extracao/conversas/:numeroId', async (req, res) => {
    const fullId = `${req.userId}_${req.params.numeroId}`;
    const n = numeros[fullId];
    if (!n || n.status !== 'conectado') return res.status(404).json({ erro: 'Número não conectado' });
    try {
        const chats = await n.client.getChats();
        const lista = chats
            .filter(c => !c.isGroup && c.id && c.id.user)
            .map(c => ({ numero: c.id.user, nome: c.name || c.pushname || 'Contato' }));
        res.json(lista);
    } catch (err) {
        console.error('[EXTRAIR CONVERSAS] Erro:', err);
        res.status(500).json({ erro: err.message || 'Erro interno ao extrair conversas' });
    }
});

// ─── rotas: logs isolados ──────────────────────────────────
app.get('/api/logs', (req, res) => {
    try {
        const arquivos = fs.readdirSync('./logs')
            .filter(f => f.startsWith(`${req.userId}_`) && f.endsWith('.json'));
        
        const lista = arquivos.map(f => {
            const baseId = f.replace(`${req.userId}_`, '').replace('.json', '');
            const fullId = `${req.userId}_${baseId}`;
            const d = disparos[fullId];
            
            let nome = d?.nome || baseId;
            
            // Se não tem no disparos, tenta ler do arquivo o campo "nome"
            if (!d) {
                try {
                    const content = JSON.parse(fs.readFileSync(`./logs/${f}`, 'utf-8'));
                    if (content.nome) nome = content.nome;
                } catch {}
            }
            
            return { id: baseId, nome };
        });
        
        // Ordenar por data (ID contém timestamp em muitos casos) ou nome
        lista.sort((a, b) => b.id.localeCompare(a.id));
        
        res.json(lista);
    } catch { res.json([]); }
});

app.get('/api/logs/:disparoId', (req, res) => {
    const baseId = req.params.disparoId;
    try {
        res.json(JSON.parse(fs.readFileSync(`./logs/${req.userId}_${baseId}.json`, 'utf-8')));
    } catch {
        res.json([]);
    }
});

// ─── rotas: configurações de IA por usuário ────────────────
const aiSettingsPath = './logs/ai_settings.json';
if (!fs.existsSync(aiSettingsPath)) fs.writeFileSync(aiSettingsPath, '{}');

app.get('/api/users/ai-settings', (req, res) => {
    try {
        const settings = JSON.parse(fs.readFileSync(aiSettingsPath, 'utf8'));
        const userSettings = settings[req.userId] || {};
        res.json({
            openai_key: userSettings.openai_key || '',
            openai_prompt: userSettings.openai_prompt || ''
        });
    } catch {
        res.json({ openai_key: '', openai_prompt: '' });
    }
});

app.get('/api/proxies', (req, res) => {
    // Bloqueado temporariamente para todos os usuários
    res.status(403).json({ erro: 'Recurso de proxy indisponível no momento.' });
});

app.post('/api/proxies/scrape', async (req, res) => {
    // Bloqueado temporariamente para todos os usuários
    res.status(403).json({ erro: 'Recurso de proxy indisponível no momento.' });
});

app.post('/api/proxies/test-all', async (req, res) => {
    // Bloqueado temporariamente para todos os usuários
    res.status(403).json({ erro: 'Recurso de proxy indisponível no momento.' });
});

app.post('/api/users/ai-settings', (req, res) => {
    try {
        const { key, prompt } = req.body;
        let settings = {};
        try { settings = JSON.parse(fs.readFileSync(aiSettingsPath, 'utf8')); } catch {}
        settings[req.userId] = {
            openai_key: key || '',
            openai_prompt: prompt || ''
        };
        fs.writeFileSync(aiSettingsPath, JSON.stringify(settings, null, 2));
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao salvar IA:', err);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

// ─── healthcheck endpoint (required by Coolify/Docker) ─────
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ─── start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════╗');
    console.log('║   🚀 ZAPLINK — INICIADO           ║');
    console.log(`║   http://localhost:${PORT}           ║`);
    console.log('╚═══════════════════════════════════╝');
    console.log('');

    // Recuperar sessões DEPOIS do servidor estar escutando
    if (fs.existsSync('./sessoes')) {
        const sessoes = fs.readdirSync('./sessoes').filter(f => f.startsWith('session-'));
        if (sessoes.length > 0) {
            console.log(`♻️ Recuperando ${sessoes.length} sessões salvas do WhatsApp sequencialmente...`);
            
            (async () => {
                for (const s of sessoes) {
                    const id = s.replace('session-', '');
                    const separatorIndex = id.indexOf('_');
                    if (separatorIndex !== -1) {
                        const userId = id.substring(0, separatorIndex);
                        const baseId = id.substring(separatorIndex + 1);
                        const meta = metaSalva[id] || {};
                        try {
                            criarCliente(userId, baseId, meta.proxy);
                        } catch (err) {
                            console.error(`❌ Erro ao recuperar sessão ${id}:`, err.message);
                        }
                        await new Promise(r => setTimeout(r, 3000));
                    }
                }
            })();
        }
    }

    // ─── Worker de Webhooks (Tempo Real) ──────────────────────
    console.log(`⚡ Worker de Webhooks ativado! Checando mensagens a cada 3s em ${SAAS_ORIGIN}`);
    setInterval(async () => {
        try {
            const url = `${SAAS_ORIGIN}/api/cron/process-webhooks`;
            const res = await fetch(url, { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                if (data.processed_count > 0) {
                    console.log(`✅ [WORKER] Processou ${data.processed_count} webhooks com sucesso!`);
                }
            }
        } catch (e) {
            // Ignorar erros de rede para não poluir o terminal
        }
    }, 3000);
});