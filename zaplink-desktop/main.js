import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import updater from 'electron-updater';
import { startServer } from './server.js';

const { autoUpdater } = updater;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow;
let splashWindow;

// ─── Single Instance Lock (MELHORIA 4) ─────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ─── Auto-Updater Config (ERRO 1 corrigido) ────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  console.log('Verificando atualizações...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Atualização disponível:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Atualização baixada:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

autoUpdater.on('error', (err) => {
  console.log('Erro no auto-updater:', err);
});

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  splashWindow.loadFile('splash.html');
  splashWindow.center();
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false, // Inicia oculto para transição suave
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    title: "ZAPLINK por Marco DMatias",
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'favicon.png')
  });

  mainWindow.loadURL(`http://localhost:${port}`);

  // Transição do Splash para o Main
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  });

  // Bloqueio de inspeção em produção (Hardening)
  if (app.isPackaged) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createSplash(); // Mostra o splash imediatamente
  
  startServer((port) => {
    if (!port) {
      console.error('❌ Falha ao iniciar o servidor. Encerrando aplicativo.');
      if (splashWindow) splashWindow.close();
      app.quit();
      return;
    }
    createWindow(port);

    // Auto-update check após UI renderizar
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(e => console.error('Auto-update check failed', e));
    }, 5000);
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// ─── ERRO 5 corrigido — reabertura no macOS ─────────────────
app.on('activate', function () {
  if (mainWindow === null) {
    startServer((port) => {
      if (port) createWindow(port);
    });
  }
});
