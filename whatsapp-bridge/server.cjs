const http = require('http');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const HOST = '127.0.0.1';
const PORT = Number(process.env.DUBWORKS_WHATSAPP_PORT || 8766);
const ROOT = __dirname;

let waState = 'iniciando';
let waDetail = 'Inicializando WhatsApp Web...';
let qrDataUrl = '';
let waNumber = '';
let client = null;
let starting = false;
let restartTimer = null;
let manualLogout = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 12) digits = digits.slice(1);
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }
  return /^\d{12,13}$/.test(digits) ? digits : '';
}

function browserPath() {
  const candidates = [
    process.env.WHATSAPP_BROWSER,
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

const executablePath = browserPath();

function createClient() {
  const instance = new Client({
    authStrategy: new LocalAuth({
      clientId: 'dubworks-manager-whatsapp-v1',
      dataPath: path.join(ROOT, '.wwebjs_auth'),
    }),
    puppeteer: {
      // O navegador fica em segundo plano. Assim, fechar uma janela visual do
      // WhatsApp não derruba a conexão usada pelo Manager.
      headless: true,
      executablePath: executablePath || undefined,
      args: [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    },
    qrMaxRetries: 8,
    authTimeoutMs: 120000,
  });

  instance.on('qr', async (qr) => {
    waState = 'qr';
    waDetail = 'Escaneie o QR Code desta janela em WhatsApp > Aparelhos conectados.';
    try {
      qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 280 });
    } catch {
      qrDataUrl = '';
    }
    console.log('\nESCANEIE ESTE QR CODE NO WHATSAPP:\n');
    qrcode.generate(qr, { small: true });
  });

  instance.on('loading_screen', (percent, message) => {
    waState = 'carregando';
    waDetail = `Carregando WhatsApp: ${percent}% ${message || ''}`.trim();
  });

  instance.on('authenticated', () => {
    waState = 'autenticando';
    waDetail = 'WhatsApp autenticado. Finalizando conexão...';
    qrDataUrl = '';
  });

  instance.on('ready', () => {
    waState = 'pronto';
    waDetail = 'WhatsApp conectado e pronto para chamadas.';
    qrDataUrl = '';
    waNumber = String(instance.info?.wid?.user || '');
    manualLogout = false;
    console.log(`WhatsApp pronto${waNumber ? ` (${waNumber})` : ''}.`);
    console.log('Pode deixar esta janela minimizada. Não precisa abrir o WhatsApp Web no navegador.');
  });

  instance.on('auth_failure', (message) => {
    waState = 'erro';
    waDetail = `Falha de autenticação: ${message}`;
    qrDataUrl = '';
    waNumber = '';
    scheduleRestart('falha de autenticação');
  });

  instance.on('disconnected', (reason) => {
    waState = 'desconectado';
    waDetail = `WhatsApp desconectado: ${reason}. Tentando reconectar...`;
    qrDataUrl = '';
    waNumber = '';
    if (!manualLogout) scheduleRestart(`desconectado: ${reason}`);
  });

  return instance;
}

async function safeDestroy() {
  const current = client;
  client = null;
  if (!current) return;
  try {
    await current.destroy();
  } catch {
    // O navegador pode já ter sido encerrado; não há problema.
  }
}

async function startWhatsApp() {
  if (starting) return;
  starting = true;
  manualLogout = false;
  waState = 'iniciando';
  waDetail = 'Inicializando WhatsApp Web em segundo plano...';

  try {
    await safeDestroy();
    client = createClient();
    await client.initialize();
  } catch (error) {
    const message = String(error?.message || error);
    console.error('Falha ao iniciar WhatsApp:', message);
    waState = 'erro';
    waDetail = `Falha ao iniciar WhatsApp: ${message}`;
    scheduleRestart('falha na inicialização');
  } finally {
    starting = false;
  }
}

function scheduleRestart(reason) {
  if (manualLogout || restartTimer) return;
  console.log(`Reconexão agendada (${reason}).`);
  restartTimer = setTimeout(async () => {
    restartTimer = null;
    waState = 'reconectando';
    waDetail = 'Tentando reconectar o WhatsApp automaticamente...';
    await startWhatsApp();
  }, 5000);
}

function corsHeaders(req) {
  const origin = String(req.headers.origin || '*');
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function sendJson(req, res, data, status = 200) {
  const body = Buffer.from(JSON.stringify(data), 'utf8');
  res.writeHead(status, {
    ...corsHeaders(req),
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Requisição muito grande.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        reject(new Error('JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

async function sendWhatsApp(phone, message) {
  if (waState !== 'pronto' || !client) {
    throw new Error('WhatsApp ainda não está conectado.');
  }

  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Número de WhatsApp inválido.');

  const text = String(message || '').trim();
  if (!text) throw new Error('A mensagem está vazia.');
  if (text.length > 12000) throw new Error('A mensagem é longa demais.');

  const numberId = await client.getNumberId(normalized);
  if (!numberId) throw new Error('Este número não foi encontrado no WhatsApp.');

  const sent = await client.sendMessage(numberId._serialized, text);
  return {
    telefone: normalized,
    message_id: sent?.id?._serialized || '',
    enviado_em: new Date().toISOString(),
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    return res.end();
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/status') {
      return sendJson(req, res, {
        ok: true,
        whatsapp: {
          state: waState,
          detail: waDetail,
          qr_data_url: qrDataUrl,
          numero: waNumber,
        },
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/send') {
      const payload = await readBody(req);
      const result = await sendWhatsApp(payload.telefone, payload.mensagem);
      return sendJson(req, res, { ok: true, ...result });
    }

    if (req.method === 'POST' && url.pathname === '/api/restart') {
      manualLogout = false;
      if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }
      await startWhatsApp();
      return sendJson(req, res, { ok: true, state: waState });
    }

    if (req.method === 'POST' && url.pathname === '/api/logout') {
      manualLogout = true;
      if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }
      try {
        if (client) await client.logout();
      } catch (error) {
        console.warn('Falha ao encerrar sessão do WhatsApp:', error);
      }
      await safeDestroy();
      waState = 'desconectado';
      waDetail = 'Sessão encerrada. Reinicie o bridge para gerar um novo QR.';
      qrDataUrl = '';
      waNumber = '';
      return sendJson(req, res, { ok: true });
    }

    return sendJson(req, res, { ok: false, error: 'Rota não encontrada.' }, 404);
  } catch (error) {
    return sendJson(req, res, { ok: false, error: String(error?.message || error) }, 400);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Bridge WhatsApp DubWorks: http://${HOST}:${PORT}`);
  console.log('Mantenha esta janela aberta (pode minimizar). O WhatsApp roda em segundo plano.');
  void startWhatsApp();
});
