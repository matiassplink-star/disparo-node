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
import machineIdPkg from 'node-machine-id';
import * as chromeLauncher from 'chrome-launcher';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import os from 'os';
import electronPkg from 'electron';
import net from 'net';
import { performance } from 'perf_hooks';
const electronApp = electronPkg.app;
dotenv.config();

const { machineIdSync } = machineIdPkg;

import jwt from 'jsonwebtoken';

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

// Configurações de Caminhos (Serão inicializados no startServer)
let USER_DATA, LOGS_DIR, CONTATOS_DIR, SESSOES_DIR, LICENSE_FILE, CONTAS_FILE, enviosPath, PROXY_POOL_FILE, aiSettingsPath;

function initializePaths() {
    if (USER_DATA) return; // Já inicializado
    
    USER_DATA = electronApp.getPath('userData');
    LOGS_DIR = path.join(USER_DATA, 'logs');
    CONTATOS_DIR = path.join(USER_DATA, 'contatos');
    SESSOES_DIR = path.join(USER_DATA, 'sessoes');
    LICENSE_FILE = path.join(USER_DATA, '.zaplink_license.json');
    CONTAS_FILE = path.join(LOGS_DIR, 'contas_metadata.json');
    enviosPath = path.join(LOGS_DIR, 'envios_diarios.json');
    PROXY_POOL_FILE = path.join(LOGS_DIR, 'proxy_pool.json');
    aiSettingsPath = path.join(LOGS_DIR, 'ai_settings.json');

    [LOGS_DIR, CONTATOS_DIR, SESSOES_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

// Configuração Supabase (ERRO 6 corrigido - Sem fallback hardcoded)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Segredo ofuscado ( WmFwTGlua0Rlc2t0b3BfMjAyNl9TZWN1cmU= -> ZapLinkDesktop_2026_Secure )
const _0x1a2b = Buffer.from('WmFwTGlua0Rlc2t0b3BfMjAyNl9TZWN1cmU=', 'base64').toString();
const ZAPLINK_SECRET = process.env.ZAPLINK_SECRET || _0x1a2b;

// Proteção contra manipulação de relógio (Anti-Bypass de Licença)
function checkTimeManipulation() {
    const RELEASE_DATE = 1714816800000; // Maio 2024
    return Date.now() < RELEASE_DATE;
}

// Função segura para pegar o HWID (evita crash se WMI falhar)
function getSafeHwid() {
    try {
        return machineIdSync();
    } catch (err) {
        console.warn('⚠️ Falha ao obter HWID nativo. Usando fallback (MAC Address).');
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                    return iface.mac;
                }
            }
        }
        return 'UNKNOWN_FALLBACK_HWID';
    }
}

// Função auxiliar para verificar a chave JWT
function verifyLicense(token) {
    initializePaths();
    
    // Bloqueia se o relógio estiver manipulado
    if (checkTimeManipulation()) {
        return { valid: false, error: 'Erro de Sincronização: O relógio do sistema está incorreto. Ajuste para a data atual.' };
    }

    if (!ZAPLINK_SECRET) {
        console.error('❌ ZAPLINK_SECRET não configurado!');
        return { valid: false, error: 'Erro de configuração do servidor (Secret não definido)' };
    }
    try {
        const payload = jwt.verify(token, ZAPLINK_SECRET);
        const hwid = getSafeHwid();
        if (payload.machineId === hwid) {
            return { valid: true, payload };
        }
        return { valid: false, error: 'A chave de ativação não pertence a este computador (HWID não confere).' };
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return { valid: false, error: 'Sua licença expirou. Por favor, renove sua assinatura para continuar usando o ZapLink.' };
        }
        return { valid: false, error: 'Chave inválida ou corrompida. Verifique se copiou corretamente.' };
    }
}

// Verifica se já está licenciado na inicialização
let isLicensed = false;
let licenseData = null;

function checkInitialLicense() {
    initializePaths();
    try {
        if (fs.existsSync(LICENSE_FILE)) {
            const data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
            if (data.key) {
                const check = verifyLicense(data.key);
                if (check.valid) {
                    isLicensed = true;
                    licenseData = check.payload;
                }
            }
        }
    } catch (e) {}
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const expressApp = express();
const server = createServer(expressApp);
const wss = new WebSocketServer({ server });

// Variáveis de arquivo (Iniciadas no startServer)

function salvarMetadadosContas() {
    if (!CONTAS_FILE) return;
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

const metaSalva = {}; // Será carregado no startServer

expressApp.use(express.json({ limit: '50mb' }));

// ─── proteção local (desktop) ─────────

expressApp.use(express.static(__dirname));

expressApp.get('/api/machine-id', (req, res) => {
    res.json({ machineId: getSafeHwid() });
});

expressApp.get('/api/notificacoes', async (req, res) => {
    if (!supabase) return res.json([]);
    try {
        const { data, error } = await supabase
            .from('notificacoes')
            .select('*')
            .order('data_criacao', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        console.error('Erro ao buscar notificações:', e.message);
        res.status(500).json({ error: 'Erro ao buscar notificações', details: e.message });
    }
});

expressApp.post('/api/activate', (req, res) => {
    const { key } = req.body;
    const check = verifyLicense(key);
    if (check.valid) {
        isLicensed = true;
        licenseData = check.payload;
        fs.writeFileSync(LICENSE_FILE, JSON.stringify({ key }));
        res.json({ success: true, payload: check.payload });
    } else {
        res.status(400).json({ success: false, error: check.error });
    }
});

expressApp.use((req, res, next) => {
    // ERRO 9 corrigido - Proteção de rotas API
    if (req.path.startsWith('/api/') && req.path !== '/api/machine-id' && req.path !== '/api/activate') {
        if (!isLicensed) return res.status(403).json({ error: 'Sistema não ativado' });
    }

    // Permitir sempre assets estáticos (não são a página principal)
    const ext = path.extname(req.path);
    if (ext && ext !== '.html') {
        return next();
    }
    
    // Se não estiver licenciado, redireciona para o login de ativação
    if (!isLicensed && req.path === '/dashboard.html') {
        return res.redirect('/login.html');
    }
    
    // Define usuário fixo admin para o painel desktop rodar com poder total
    req.userId = 'admin';
    req.plano = 'admin';
    return next();
});

expressApp.get('/', (req, res) => {
    if (isLicensed) {
        res.sendFile(path.join(__dirname, 'dashboard.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

// ─── pastas ────────────────────────────────────────────────
// Removido: agora gerenciado pelo initializePaths() no startServer


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
function carregarProxyPool() {
    try { return JSON.parse(fs.readFileSync(PROXY_POOL_FILE, 'utf8')); } catch { return []; }
}

function salvarProxyPool(pool) {
    fs.writeFileSync(PROXY_POOL_FILE, JSON.stringify(pool, null, 2));
}



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
let clients = []; 

function broadcast(userId, tipo, dados) {
    // Broadcast Global para o Desktop - Envia para todas as telas abertas
    clients.forEach(ws => {
        if (ws.readyState === 1) { // OPEN
            ws.send(JSON.stringify({ tipo, dados }));
        }
    });
}

wss.on('connection', (ws, req) => {
    clients.push(ws);
    console.log(`[WS] Nova tela conectada. Total: ${clients.length}`);

    ws.on('close', () => {
        clients = clients.filter(c => c !== ws);
        console.log(`[WS] Tela desconectada. Restantes: ${clients.length}`);
    });

    const userId = 'admin';
    ws.userId = userId;
    ws.plano = 'admin';
    
    // Calcula dias restantes
    let diasRestantes = 'Vitalício';
    let nomeCliente = 'Usuário';
    if (licenseData) {
        nomeCliente = licenseData.nome || 'Usuário';
        if (licenseData.exp) {
            const agora = Math.floor(Date.now() / 1000);
            const diff = licenseData.exp - agora;
            diasRestantes = Math.max(0, Math.ceil(diff / (60 * 60 * 24)));
        }
    }
    
    ws.send(JSON.stringify({ tipo: 'init', dados: { plano: 'admin', diasRestantes, nomeCliente } }));
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

function sortearMensagem(variacoes, contatoObj) {
    const idx = Math.floor(Math.random() * variacoes.length);
    let txt = variacoes[idx];
    
    // Substituir {nome}
    txt = txt.replace(/{nome}/g, contatoObj.nome || 'amigo');
    
    // Substituir {var1}, {var2}...
    if (contatoObj.extras && contatoObj.extras.length > 0) {
        contatoObj.extras.forEach((val, i) => {
            const regex = new RegExp(`{var${i + 1}}`, 'g');
            txt = txt.replace(regex, val || '');
        });
    }
    
    return txt;
}

async function gerarMensagemGPT(promptTemplate, contatoObj, apiKey, model = 'gpt-4o-mini') {
    let p = promptTemplate.replace(/{nome}/g, contatoObj.nome || 'amigo');
    
    // Substituir variáveis no prompt enviado ao GPT
    if (contatoObj.extras && contatoObj.extras.length > 0) {
        contatoObj.extras.forEach((val, i) => {
            const regex = new RegExp(`{var${i + 1}}`, 'g');
            p = p.replace(regex, val || '');
        });
    }

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
    const arquivo = path.join(LOGS_DIR, `${userId}_${disparoBaseId}.json`);
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(arquivo, 'utf-8')); } catch { /* arquivo não existe ainda */ }
    logs.unshift({ ...entrada, hora: new Date().toISOString() });
    fs.writeFileSync(arquivo, JSON.stringify(logs, null, 2));
    broadcast(userId, 'log', { disparoId: disparoBaseId, entrada: { ...entrada, hora: new Date().toISOString() } });
}

// ─── GERENCIAMENTO DE RAM E LIMPEZA (FASE 2) ───────────────
function startJanitor() {
    console.log('🧹 [JANITOR] Iniciando rotina de limpeza de memória e cache...');
    
    // 1. Monitorar RAM do Sistema
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usage = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
    console.log(`📊 [JANITOR] Uso de RAM do Sistema: ${usage}%`);

    // 2. Limpar Cache do Chrome não utilizado (mais de 24h)
    const cacheRoot = path.join(USER_DATA, 'chrome-cache');
    if (fs.existsSync(cacheRoot)) {
        try {
            const folders = fs.readdirSync(cacheRoot);
            const activeIds = Object.keys(numeros).map(id => id.split('_').slice(1).join('_'));
            
            folders.forEach(folder => {
                // Se a pasta não pertence a um número ativo, deleta
                if (!activeIds.includes(folder)) {
                    const folderPath = path.join(cacheRoot, folder);
                    const stats = fs.statSync(folderPath);
                    const diffHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
                    
                    if (diffHours > 24) {
                        console.log(`🗑️ [JANITOR] Removendo cache antigo: ${folder}`);
                        fs.rmSync(folderPath, { recursive: true, force: true });
                    }
                }
            });
        } catch (e) {
            console.error('[JANITOR] Erro ao limpar cache:', e);
        }
    }

    // 3. Verificar processos órfãos
    Object.entries(numeros).forEach(async ([id, n]) => {
        if (n.status === 'erro' || n.status === 'desconectado') {
            const diffHours = (Date.now() - (n.lastActive || Date.now())) / (1000 * 60 * 60);
            if (diffHours > 2) {
                console.log(`♻️ [JANITOR] Liberando recursos de conta inativa: ${id}`);
                try { await n.client.destroy(); } catch {}
                delete numeros[id];
            }
        }
    });
}

// Rodar Janitor a cada 30 minutos
setInterval(startJanitor, 30 * 60 * 1000);

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
    
    // Usar pasta temporária única para o cache do Chrome para evitar conflito de acesso (Erro 0x5)
    const cacheDir = path.join(os.tmpdir(), `zaplink-cache-${baseId}-${Date.now()}`);
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const puppeteerArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--allow-running-insecure-content',
        '--mute-audio',
        '--no-zygote',
        '--no-first-run',
        '--disable-gpu',
        '--disable-infobars',
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu-program-cache',
        '--disable-gpu-shader-disk-cache',
        '--disk-cache-size=1',
        `--disk-cache-dir=${cacheDir}`,
        '--js-flags="--max-old-space-size=4096"'
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
    const sessionDir = path.join(SESSOES_DIR, `session-${id}`);
    function removeLockFilesRecursive(dir) {
        if (!fs.existsSync(dir)) return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    removeLockFilesRecursive(fullPath);
                } else if (entry.name.toLowerCase().includes('lock') || entry.name.startsWith('Singleton')) {
                    try { fs.unlinkSync(fullPath); } catch (e) {}
                }
            }
        } catch (e) {}
    }
    removeLockFilesRecursive(sessionDir);

    // Encontra o Chrome instalado no PC para evitar download lento do Chromium
    let localChromePath = process.env.CHROME_PATH || undefined;
    if (!localChromePath) {
        try {
            const chromeInstallations = chromeLauncher.Launcher.getInstallations();
            if (chromeInstallations.length > 0) {
                localChromePath = chromeInstallations[0];
                console.log(`[CHROME] Chrome local encontrado em: ${localChromePath}`);
            }
        } catch (e) {
            console.log('[CHROME] Aviso: Não foi possível detectar Chrome localmente.');
        }
    }

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: id, dataPath: SESSOES_DIR }),
        // Sem webVersionCache — usa o mecanismo padrão do whatsapp-web.js
        puppeteer: {
            headless: true,
            args: puppeteerArgs,
            executablePath: localChromePath || undefined,
            ignoreDefaultArgs: ['--enable-automation'], // Remove flag que denuncia automação
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
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

    client.on('authenticated', () => {
        console.log(`📡 [${id}] Autenticado com sucesso! Carregando dados...`);
        numeros[id].status = 'autenticado';
        broadcast(userId, 'numeros', listarNumeros(userId));
    });

    client.on('ready', async () => {
        try {
            console.log(`✅ [${id}] WhatsApp Pronto!`);
            const info = client.info;
            numeros[id].status = 'conectado';
            numeros[id].qrCode = null;
            numeros[id].numero = info.wid.user;
            numeros[id].nome = info.pushname;
            salvarMetadadosContas();
            broadcast(userId, 'numeros', listarNumeros(userId));
            console.log(`🚀 Número conectado: +${info.wid.user} (${info.pushname})`);
        } catch (err) {
            console.error('❌ Erro no ready:', err.message);
        }
    });

    client.on('loading_screen', (percent, message) => {
        console.log(`⏳ [${id}] Carregando: ${percent}% - ${message}`);
    });

    // Chat Real-time listeners
    client.on('message', async (msg) => {
        broadcast(userId, 'new_message', {
            numeroId: id.replace(`${userId}_`, ''),
            chatId: msg.from,
            id: msg.id._serialized,
            body: msg.body,
            timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
            fromMe: false,
            name: msg.author || msg.from.split('@')[0],
            type: msg.type,
            hasMedia: msg.hasMedia
        });
    });

    client.on('message_create', async (msg) => {
        if (msg.fromMe) {
            broadcast(userId, 'new_message', {
                numeroId: id.replace(`${userId}_`, ''),
                chatId: msg.to,
                id: msg.id._serialized,
                body: msg.body,
                timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
                fromMe: true,
                type: msg.type,
                hasMedia: msg.hasMedia
            });
        }
    });

    client.on('change_state', state => {
        console.log(`🔄 [${id}] Estado mudou para: ${state}`);
    });

    client.on('auth_failure', (msg) => {
        console.error(`❌ [${id}] Falha de autenticação: ${msg}`);
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
        return fs.readdirSync(CONTATOS_DIR)
            .filter(f => f.startsWith(`${userId}_`) && f.endsWith('.json'))
            .map(f => {
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(CONTATOS_DIR, f), 'utf-8'));
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
    try { return JSON.parse(fs.readFileSync(path.join(CONTATOS_DIR, `${userId}_${baseId}.json`), 'utf-8')); }
    catch { return null; }
}

function salvarCampanha(userId, baseId, data) {
    fs.writeFileSync(path.join(CONTATOS_DIR, `${userId}_${baseId}.json`), JSON.stringify(data, null, 2));
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
            const extras = partes.slice(2).map(v => v.trim());
            
            // Se for número BR sem DDI, adiciona 55
            if (numero.length >= 10 && numero.length <= 11 && !numero.startsWith('55')) {
                numero = '55' + numero;
            }
            
            return { numero, nome, extras };
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
        d.numeroAtivo = numeros[clienteId]?.numero || clienteId.replace(`${userId}_`, '');

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
                    mensagem = await gerarMensagemGPT(cfg.gptPrompt, contato, cfg.gptKey, cfg.gptModel);
                } catch {
                    mensagem = sortearMensagem(cfg.variacoes || ['Olá {nome}!'], contato);
                }
            } else {
                mensagem = sortearMensagem(cfg.variacoes || ['Olá {nome}!'], contato);
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
                const options = { caption: mensagem };
                if (cfg.midia.mimetype === 'audio/ogg' || cfg.midia.mimetype.includes('audio/ogg;')) {
                    options.sendAudioAsVoice = true;
                }
                await client.sendMessage(chatId, media, options);
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

            // NOTA: São aplicados dois delays SEQUENCIALMENTE por design:
            // 1. delayAposEnvio (padrão: 5s) — delay fixo imediato após envio
            // 2. delayGaussiano (padrão: 8-12s) — delay variável anti-ban entre mensagens
            // Total médio: ~15s por mensagem. Configurável via painel de campanha.
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
expressApp.get('/api/numeros', (req, res) => res.json(listarNumeros(req.userId)));

expressApp.post('/api/numeros', (req, res) => {
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
    
    // Salvar metadados imediatamente
    metaSalva[fullId] = { proxy, nome: req.body.nome || '' };
    salvarMetadadosContas();

    criarCliente(req.userId, baseId, proxy);
    res.json({ id: baseId });
});

expressApp.delete('/api/numeros/:id', async (req, res) => {
    const id = `${req.userId}_${req.params.id}`;
    if (numeros[id]) {
        try { await numeros[id].client.destroy(); } catch { /* ignorar */ }
        delete numeros[id];
        
        // Deletar a pasta da sessão para não recarregar no restart
        const sessionPath = path.join(SESSOES_DIR, `session-${id}`);
        if (fs.existsSync(sessionPath)) {
            try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch {}
        }
        
        broadcast(req.userId, 'numeros', listarNumeros(req.userId));
    }
    res.json({ ok: true });
});

// ─── rotas de Chat (removidas — versão High Fidelity registrada abaixo em L1875) ───

// ─── rotas: campanhas isoladas ─────────────────────────────
expressApp.get('/api/campanhas', (req, res) => res.json(listarCampanhas(req.userId)));

expressApp.post('/api/campanhas', (req, res) => {
    const { nome, texto } = req.body;
    if (!nome || !texto) return res.status(400).json({ erro: 'Nome e contatos são obrigatórios' });
    const baseId = nome.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const contatos = parsearContatos(texto);
    if (!contatos.length) return res.status(400).json({ erro: 'Nenhum contato válido encontrado' });
    salvarCampanha(req.userId, baseId, { nome, criado: new Date().toISOString(), contatos });
    res.json({ id: baseId, total: contatos.length });
});

expressApp.get('/api/campanhas/:id', (req, res) => {
    const campanha = carregarCampanha(req.userId, req.params.id);
    if (!campanha) return res.status(404).json({ erro: 'Lista não encontrada' });
    res.json(campanha);
});

expressApp.delete('/api/campanhas/:id', (req, res) => {
    const baseId = req.params.id;
    try {
        fs.unlinkSync(path.join(CONTATOS_DIR, `${req.userId}_${baseId}.json`));
        broadcast(req.userId, 'campanhas', listarCampanhas(req.userId));
        res.json({ ok: true });
    } catch (err) {
        res.status(404).json({ erro: 'Campanha não encontrada' });
    }
});

// ─── rotas: disparos isolados ──────────────────────────────
expressApp.get('/api/disparos', (req, res) => res.json(listarDisparos(req.userId)));

expressApp.post('/api/disparos', (req, res) => {
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

expressApp.post('/api/disparos/pausar-todos', (req, res) => {
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

expressApp.post('/api/disparos/retomar-todos', (req, res) => {
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

expressApp.post('/api/disparos/parar-todos', (req, res) => {
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

// Rotas específicas para controle individual de módulos (Evita parar tudo)
expressApp.post('/api/limpeza/parar', (req, res) => {
    const userId = req.userId;
    if (limpezaStatus[userId]) limpezaStatus[userId].status = 'parado';
    res.json({ ok: true });
});

expressApp.post('/api/grupos/enviar-massa/parar', (req, res) => {
    const userId = req.userId;
    if (envioGruposStatus[userId]) envioGruposStatus[userId].status = 'parado';
    res.json({ ok: true });
});

expressApp.post('/api/grupos/adicionar/parar', (req, res) => {
    const userId = req.userId;
    if (addGruposStatus[userId]) addGruposStatus[userId].status = 'parado';
    res.json({ ok: true });
});

expressApp.post('/api/disparos/:id/pausar', (req, res) => {
    const fullId = `${req.userId}_${req.params.id}`;
    const d = disparos[fullId];
    if (!d) return res.status(404).json({ erro: 'Disparo não encontrado' });
    if (d.status === 'rodando') {
        d.status = 'pausado';
        broadcast(req.userId, 'disparos', listarDisparos(req.userId));
    }
    res.json({ ok: true, status: d.status });
});

expressApp.post('/api/disparos/:id/retomar', (req, res) => {
    const fullId = `${req.userId}_${req.params.id}`;
    const d = disparos[fullId];
    if (!d) return res.status(404).json({ erro: 'Disparo não encontrado' });
    if (d.status === 'pausado') {
        d.status = 'rodando';
        broadcast(req.userId, 'disparos', listarDisparos(req.userId));
    }
    res.json({ ok: true, status: d.status });
});

expressApp.post('/api/disparos/:id/parar', (req, res) => {
    const fullId = `${req.userId}_${req.params.id}`;
    const d = disparos[fullId];
    if (!d) return res.status(404).json({ erro: 'Disparo não encontrado' });
    d.status = 'parado';
    broadcast(req.userId, 'disparos', listarDisparos(req.userId));
    res.json({ ok: true });
});

expressApp.post('/api/disparos/:id/rotacao', (req, res) => {
    const fullId = `${req.userId}_${req.params.id}`;
    const d = disparos[fullId];
    if (!d) return res.status(404).json({ erro: 'Disparo não encontrado' });
    d.config.rotacaoAtiva = req.body.ativa !== false;
    broadcast(req.userId, 'disparos', listarDisparos(req.userId));
    res.json({ ok: true, rotacaoAtiva: d.config.rotacaoAtiva });
});

// ─── rotas: grupos e extração ──────────────────────────────
expressApp.get('/api/grupos/:numeroId', async (req, res) => {
    const fullId = `${req.userId}_${req.params.numeroId}`;
    const n = numeros[fullId];
    if (!n || n.status !== 'conectado') return res.status(404).json({ erro: 'Número não conectado' });
    
    try {
        console.log(`[GRUPOS] Solicitando lista para ${fullId}...`);
        
        // Timeout maior para leitura de grupos (90s)
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
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 90000))
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

expressApp.get('/api/grupos/:numeroId/:grupoId/membros', async (req, res) => {
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

expressApp.post('/api/grupos/enviar', async (req, res) => {
    const { numeroId, grupoId, mensagem, midia } = req.body;
    const fullId = `${req.userId}_${numeroId}`;
    const n = numeros[fullId];
    if (!n || n.status !== 'conectado') return res.status(404).json({ erro: 'Número não conectado' });
    try {
        if (midia && midia.data) {
            const media = new MessageMedia(midia.mimetype, midia.data, midia.filename);
            const options = { caption: mensagem };
            if (midia.mimetype === 'audio/ogg' || midia.mimetype.includes('audio/ogg;')) {
                options.sendAudioAsVoice = true;
            }
            await n.client.sendMessage(grupoId, media, options);
        } else {
            await n.client.sendMessage(grupoId, mensagem);
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ─── envio em massa para grupos ─────────────────────────
expressApp.post('/api/grupos/enviar-massa', async (req, res) => {
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

    // C3: Parar envio anterior se existir para este usuário
    if (envioGruposStatus[userId] && envioGruposStatus[userId].status === 'rodando') {
        envioGruposStatus[userId].status = 'parado';
        await new Promise(r => setTimeout(r, 1000)); // Pequeno delay para encerrar
    }

    envioGruposStatus[userId] = { status: 'rodando', total: gruposIds.length, atual: 0, enviados: 0, falhas: 0 };

    // Função de execução
    const executarEnvioMassa = async () => {
        const job = envioGruposStatus[userId];
        let indiceAtual = 0;
        let contadorTroca = 0;
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
                        mensagem = await gerarMensagemGPT(gptPrompt, { nome: '', extras: [] }, gptKey, req.body.gptModel);
                    } else if (variacoes && variacoes.length) {
                        mensagem = variacoes[Math.floor(Math.random() * variacoes.length)];
                    } else {
                        mensagem = '';
                    }
                    
                    const chat = await n.client.getChatById(gruposIds[i]);
                    
                    // M3: Verificar se o grupo é apenas leitura (apenas admins enviam)
                    if (chat.isReadOnly) {
                        throw new Error('Permissão negada: apenas admins podem enviar mensagens');
                    }

                    if (midia && midia.data) {
                        const media = new MessageMedia(midia.mimetype, midia.data, midia.filename);
                        const options = { caption: mensagem };
                        if (midia.mimetype === 'audio/ogg' || midia.mimetype.includes('audio/ogg;')) {
                            options.sendAudioAsVoice = true;
                        }
                        await n.client.sendMessage(gruposIds[i], media, options);
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
        fs.writeFileSync(path.join(LOGS_DIR, `${userId}_${logId}.json`), JSON.stringify(logData, null, 2));
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
    
    res.json({ ok: true, msg: 'Envio em massa para grupos iniciado.' });
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
    fs.writeFileSync(path.join(LOGS_DIR, `${userId}_${logId}.json`), JSON.stringify(logData, null, 2));
}

expressApp.post('/api/grupos/adicionar', async (req, res) => {
    const { numerosIds, grupoId, contatos, delayMs, trocaApos } = req.body;
    const userId = req.userId;
    
    if (!numerosIds || !numerosIds.length) return res.status(400).json({ erro: 'Nenhum número remetente selecionado' });

    // C3: Parar adição anterior se existir para este usuário
    if (addGruposStatus[userId] && addGruposStatus[userId].status === 'rodando') {
        addGruposStatus[userId].status = 'parado';
        await new Promise(r => setTimeout(r, 1000));
    }

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
                // Validação SEQUENCIAL para evitar sobrecarga (Anti-Ban)
                console.log(`[BRUTAL] Validando ${contatos.length} números sequencialmente...`);
                const jids = [];
                for (let i = 0; i < contatos.length; i++) {
                    // CHECAGEM DE INTERRUPÇÃO
                    if (job.status === 'parado') {
                        console.log(`[BRUTAL] Validação interrompida pelo usuário.`);
                        return;
                    }

                    const num = contatos[i];
                    try {
                        const jid = await getCorrectJid(n.client, num);
                        if (jid) jids.push(jid);
                    } catch {}
                    
                    if (i % 10 === 0) await new Promise(r => setTimeout(r, 200));
                }

                console.log(`[BRUTAL] ${jids.length} números válidos encontrados. Iniciando adição...`);

                if (jids.length > 0) {
                    const chat = await n.client.getChatById(grupoId);
                    
                    // B5: Verificar se o emissor é admin do grupo
                    const myJid = n.client.info.wid._serialized;
                    const me = chat.participants.find(p => p.id._serialized === myJid);
                    if (!me || (!me.isAdmin && !me.isSuperAdmin)) {
                        throw new Error('Permissão negada: seu número não é administrador deste grupo.');
                    }
                    
                    for (let k = 0; k < jids.length; k += 5) {
                        // CHECAGEM DE INTERRUPÇÃO
                        if (job.status === 'parado') {
                            console.log(`[BRUTAL] Adição interrompida pelo usuário.`);
                            return;
                        }

                        const chunk = jids.slice(k, k + 5);
                        console.log(`[BRUTAL] Lote ${Math.floor(k/5)+1}/${Math.ceil(jids.length/5)} - Tentando ${chunk.length} membros...`);
                        
                        try {
                            // Tenta adicionar o lote
                            const resAdd = await chat.addParticipants(chunk);
                            
                            if (resAdd && typeof resAdd === 'object') {
                                Object.keys(resAdd).forEach(jid => {
                                    const num = jid.split('@')[0];
                                    const code = resAdd[jid].code;
                                    let statusMsg = code === 200 ? 'Sucesso' : `Erro ${code}`;
                                    
                                    // Tradução amigável de erros comuns do WhatsApp
                                    if (code === 403) statusMsg = 'Privacidade do Usuário';
                                    if (code === 404) statusMsg = 'Número não existe';
                                    if (code === 409) statusMsg = 'Já está no grupo';
                                    if (code === 500) statusMsg = 'Erro Interno/Admin Required';

                                    console.log(`[BRUTAL-RES] ${num}: ${statusMsg}`);
                                    job.resultados.push({ 
                                        numero: num, 
                                        status: code === 200 ? 'adicionado' : 'erro',
                                        msg: statusMsg
                                    });
                                });
                            }
                        } catch (e) {
                            console.error(`[BRUTAL] Erro fatal no lote:`, e.message);
                        }
                        
                        job.atual = Math.min(k + 5, jids.length);
                        broadcast(userId, 'progresso_add_grupos', job);
                        // Delay entre lotes no modo brutal (rápido mas seguro)
                        await new Promise(r => setTimeout(r, 1200));
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
        // B5: Verificar admin antes de começar (no primeiro chip disponível)
        try {
            let nInit = numeros[`${userId}_${numerosIds[0]}`];
            if (nInit && nInit.status === 'conectado') {
                const chatInit = await nInit.client.getChatById(grupoId);
                const myJid = nInit.client.info.wid._serialized;
                const me = chatInit.participants.find(p => p.id._serialized === myJid);
                if (!me || (!me.isAdmin && !me.isSuperAdmin)) {
                    job.status = 'erro';
                    job.resultados.push({ numero: 'SISTEMA', status: 'erro', msg: 'Você não é admin do grupo' });
                    broadcast(userId, 'progresso_add_grupos', job);
                    return;
                }
            }
        } catch (e) { console.error('Erro ao pré-validar admin:', e.message); }

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
                            else if (statusRes.code === 500) motivo = 'Grupo restrito/Sem admin';
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

expressApp.post('/api/listas/verificar', async (req, res) => {
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
    limpezaStatus[req.userId] = { status: 'rodando', total: contatos.length, atual: 0, validos: 0, invalidos: 0 };

    const executarVerificacao = async () => {
        const job = limpezaStatus[req.userId];
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
                    // Delay randômico entre 1.5s e 3s para simular comportamento humano
                    const waitTime = Math.floor(Math.random() * 1500) + 1500;
                    await new Promise(r => setTimeout(r, waitTime));

                    const jid = await getCorrectJid(n.client, numero);
                    if (jid) {
                        validos.push(numero);
                        console.log(`[LIMPEZA] ${numero} -> VÁLIDO`);
                    } else {
                        invalidos.push(numero);
                        console.log(`[LIMPEZA] ${numero} -> INVÁLIDO`);
                    }
                } catch (e) {
                    invalidos.push(numero);
                    console.error(`[LIMPEZA] Erro ao verificar ${numero}:`, e.message);
                }
                
                // Enviar progresso via WebSocket
                if (i % 1 === 0 || i === contatos.length - 1) {
                    job.atual = i + 1;
                    job.validos = validos.length;
                    job.invalidos = invalidos.length;
                    broadcast(req.userId, 'progresso_limpeza', job);
                }
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
    res.json({ ok: true });
});

expressApp.get('/api/extracao/agenda/:numeroId', async (req, res) => {
    const fullId = `${req.userId}_${req.params.numeroId}`;
    const n = numeros[fullId];
    if (!n || n.status !== 'conectado' || !n.client) {
        return res.status(404).json({ erro: 'Número não conectado ou inicializando...' });
    }
    try {
        console.log(`[EXTRAIR AGENDA] Iniciando para ${fullId}...`);
        const contatos = await n.client.getContacts();
        const lista = contatos
            .filter(c => c && (c.number || (c.id && c.id.user)))
            .map(c => ({ 
                numero: c.number || c.id.user, 
                nome: c.name || c.pushname || 'Contato' 
            }));
        console.log(`[EXTRAIR AGENDA] Sucesso: ${lista.length} contatos encontrados.`);
        res.json(lista);
    } catch (err) {
        console.error('[EXTRAIR AGENDA] Erro fatal:', err);
        res.status(500).json({ erro: 'O WhatsApp demorou muito para responder. Tente novamente em alguns segundos.' });
    }
});

expressApp.get('/api/extracao/conversas/:numeroId', async (req, res) => {
    const fullId = `${req.userId}_${req.params.numeroId}`;
    const n = numeros[fullId];
    if (!n || n.status !== 'conectado' || !n.client) {
        return res.status(404).json({ erro: 'Número não conectado ou inicializando...' });
    }
    try {
        console.log(`[EXTRAIR CONVERSAS] Iniciando para ${fullId}...`);
        const chats = await n.client.getChats();
        const lista = chats
            .filter(c => c && !c.isGroup && c.id && c.id.user)
            .map(c => ({ 
                numero: c.id.user, 
                nome: c.name || c.pushname || 'Contato' 
            }));
        console.log(`[EXTRAIR CONVERSAS] Sucesso: ${lista.length} conversas encontradas.`);
        res.json(lista);
    } catch (err) {
        console.error('[EXTRAIR CONVERSAS] Erro fatal:', err);
        res.status(500).json({ erro: 'O WhatsApp demorou muito para responder. Tente novamente em alguns segundos.' });
    }
});

// ─── rotas: logs isolados ──────────────────────────────────
expressApp.get('/api/logs', (req, res) => {
    try {
        const arquivos = fs.readdirSync(LOGS_DIR)
            .filter(f => f.startsWith(`${req.userId}_`) && f.endsWith('.json'));
        
        const lista = arquivos.map(f => {
            const baseId = f.replace(`${req.userId}_`, '').replace('.json', '');
            const fullId = `${req.userId}_${baseId}`;
            const d = disparos[fullId];
            
            let nome = d?.nome || baseId;
            
            // Se não tem no disparos, tenta ler do arquivo o campo "nome"
            if (!d) {
                try {
                    const content = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, f), 'utf-8'));
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

expressApp.get('/api/logs/:disparoId', (req, res) => {
    const baseId = req.params.disparoId;
    try {
        res.json(JSON.parse(fs.readFileSync(path.join(LOGS_DIR, `${req.userId}_${baseId}.json`), 'utf-8')));
    } catch {
        res.json([]);
    }
});

// ─── rotas: configurações de IA por usuário ────────────────
// ─── rotas: configurações de IA por usuário ────────────────
if (aiSettingsPath && !fs.existsSync(aiSettingsPath)) fs.writeFileSync(aiSettingsPath, '{}');

expressApp.get('/api/users/ai-settings', (req, res) => {
    try {
        const settings = JSON.parse(fs.readFileSync(aiSettingsPath, 'utf8'));
        const userSettings = settings[req.userId] || {};
        res.json({
            openai_key: userSettings.openai_key || '',
            openai_prompt: userSettings.openai_prompt || '',
            openai_model: userSettings.openai_model || 'gpt-4o-mini'
        });
    } catch {
        res.json({ openai_key: '', openai_prompt: '', openai_model: 'gpt-4o-mini' });
    }
});

expressApp.get('/api/proxies', (req, res) => {
    // Bloqueado temporariamente para todos os usuários
    res.status(403).json({ erro: 'Recurso de proxy indisponível no momento.' });
});

expressApp.post('/api/proxies/scrape', async (req, res) => {
    // Bloqueado temporariamente para todos os usuários
    res.status(403).json({ erro: 'Recurso de proxy indisponível no momento.' });
});

expressApp.post('/api/proxies/test-all', async (req, res) => {
    // Bloqueado temporariamente para todos os usuários
    res.status(403).json({ erro: 'Recurso de proxy indisponível no momento.' });
});

expressApp.post('/api/users/ai-settings', (req, res) => {
    try {
        const { openai_key, openai_prompt, openai_model } = req.body;
        let settings = {};
        try { settings = JSON.parse(fs.readFileSync(aiSettingsPath, 'utf8')); } catch {}
        settings[req.userId] = {
            openai_key: openai_key || '',
            openai_prompt: openai_prompt || '',
            openai_model: openai_model || 'gpt-4o-mini'
        };
        fs.writeFileSync(aiSettingsPath, JSON.stringify(settings, null, 2));
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao salvar IA:', err);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

// ─── healthcheck endpoint (required by Coolify/Docker) ─────
expressApp.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ─── start ─────────────────────────────────────────────────
// ─── rotas de Chat (High Fidelity) ──────────────────────────
expressApp.get('/api/chat/conversas/:numeroId', async (req, res) => {
    try {
        const n = numeros[`${req.userId}_${req.params.numeroId}`];
        if (!n || n.status !== 'conectado') return res.status(404).json([]);
        const chats = await Promise.race([
            n.client.getChats(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 120000))
        ]);
        
        const result = [];
        const chatsSlice = chats.slice(0, 40);
        
        for (const c of chatsSlice) {
            let pic = null;
            try { 
                pic = await n.client.getProfilePicUrl(c.id._serialized); 
                // Pequeno delay para não sobrecarregar o Chrome
                await new Promise(r => setTimeout(r, 100)); 
            } catch {}
            result.push({
                id: c.id._serialized,
                name: c.name,
                lastMessage: c.lastMessage ? { body: c.lastMessage.body, timestamp: c.lastMessage.timestamp } : null,
                unreadCount: c.unreadCount,
                isGroup: c.isGroup,
                pic
            });
        }
        res.json(result);
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

expressApp.get('/api/chat/mensagens/:numeroId/:chatId', async (req, res) => {
    try {
        const n = numeros[`${req.userId}_${req.params.numeroId}`];
        if (!n || n.status !== 'conectado') return res.status(404).json([]);
        
        const chat = await n.client.getChatById(req.params.chatId);
        // Timeout de segurança para mensagens
        const msgs = await Promise.race([
            chat.fetchMessages({ limit: 50 }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 45000))
        ]);

        const result = msgs.map(m => ({
            id: m.id._serialized,
            fromMe: m.fromMe,
            body: m.body,
            timestamp: m.timestamp,
            type: m.type,
            hasMedia: m.hasMedia
        }));
        res.json({ messages: result });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

expressApp.post('/api/chat/enviar', async (req, res) => {
    try {
        const { numeroId, chatId, mensagem, media } = req.body;
        const n = numeros[`${req.userId}_${numeroId}`];
        if (!n || n.status !== 'conectado') return res.status(404).json({ erro: 'Dispositivo desconectado' });
        
        let sent;
        if (media) {
            const messageMedia = new MessageMedia(media.mimetype, media.data, media.filename);
            const options = { caption: mensagem };
            
            // Ativa gravação de voz apenas para ogg nativo (gravador do painel) para evitar crash de FFmpeg em MP3
            if (media.mimetype === 'audio/ogg' || media.mimetype.includes('audio/ogg;')) {
                options.sendAudioAsVoice = true;
            }
            
            sent = await n.client.sendMessage(chatId, messageMedia, options);
        } else {
            sent = await n.client.sendMessage(chatId, mensagem);
        }
        
        res.json({ ok: true, id: sent.id._serialized });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

expressApp.get('/api/chat/media/:numeroId/:msgId', async (req, res) => {
    try {
        const n = numeros[`${req.userId}_${req.params.numeroId}`];
        if (!n || n.status !== 'conectado') return res.status(404).send('Not found');
        const msg = await n.client.getMessageById(req.params.msgId);
        if (!msg || !msg.hasMedia) return res.status(404).send('No media');
        const media = await msg.downloadMedia();
        if (!media) return res.status(404).send('Media unavailable');
        const buffer = Buffer.from(media.data, 'base64');
        res.set('Content-Type', media.mimetype);
        res.send(buffer);
    } catch (err) { res.status(500).send('Error'); }
});

export function startServer(callback) {
    initializePaths();
    checkInitialLicense();

    if (!fs.existsSync(CONTAS_FILE)) fs.writeFileSync(CONTAS_FILE, '{}');
    if (!fs.existsSync(enviosPath)) fs.writeFileSync(enviosPath, '{}');
    if (!fs.existsSync(PROXY_POOL_FILE)) fs.writeFileSync(PROXY_POOL_FILE, '[]');
    if (!fs.existsSync(aiSettingsPath)) fs.writeFileSync(aiSettingsPath, '{}');

    // Carrega metadados das contas (nomes/números)
    try {
        const data = JSON.parse(fs.readFileSync(CONTAS_FILE, 'utf8'));
        Object.assign(metaSalva, data);
    } catch (e) {}

    const PORT = process.env.PORT || 0; // 0 faz o OS escolher uma porta livre automaticamente
    const listener = server.listen(PORT, () => {
        const actualPort = listener.address().port;
        const urlStr = `http://localhost:${actualPort}`;
        const padding = ' '.repeat(Math.max(0, 35 - urlStr.length));
        
        console.log('');
        console.log('╔═══════════════════════════════════╗');
        console.log('║   🚀 ZAPLINK DESKTOP INICIADO     ║');
        console.log(`║   ${urlStr}${padding}║`);
        console.log('╚═══════════════════════════════════╝');
        console.log('');

        // Recuperar sessões DEPOIS do servidor estar escutando
        if (SESSOES_DIR && fs.existsSync(SESSOES_DIR)) {
            const sessoes = fs.readdirSync(SESSOES_DIR).filter(f => f.startsWith('session-'));
            if (sessoes.length > 0) {
                console.log(`♻️ Recuperando ${sessoes.length} sessões salvas do WhatsApp...`);
                
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
                                // Broadcast imediato para cada número recuperado
                                broadcast(userId, 'numeros', listarNumeros(userId));
                            } catch (err) {
                                console.error(`❌ Erro ao recuperar sessão ${id}:`, err.message);
                            }
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    }
                })();
            }
        }
        
        if (callback) callback(actualPort);
    });

    listener.on('error', (err) => {
        console.error(`❌ Falha ao iniciar servidor (${err.code}): ${err.message}`);
        if (callback) callback(null);
    });
}

// Para compatibilidade e não quebrar se rodar direto do terminal (node server.js)
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
    startServer();
}
