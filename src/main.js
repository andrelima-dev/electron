const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { createLogger } = require('./common/logger');
const authService = require('./services/auth-service');
const FileApiServer = require('./services/file-api-server');
const FileService = require('./services/file-service');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let sessionWindow;
let currentUser = null;
let sessionTimer = null;
let fileApiServer = null;
let fileService = null;
const log = createLogger('main');

// Variáveis para controle do modo quiosque
const KIOSK_LOCK_FILE = path.join(app.getPath('appData'), 'appteste', '.quiosque-lock');
let kioskLockWatcher = null;
let kioskEnabled = true;

// Funções auxiliares importadas dos helpers
const { safeHandle } = require('./helpers/safeHandle');
const { releaseWorkstation, startSession } = require('./helpers/sessionManager');


// Função para criar o arquivo de lock do quiosque
function createKioskLockFile() {
  try {
    const dir = path.dirname(KIOSK_LOCK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(KIOSK_LOCK_FILE, JSON.stringify({
      created: new Date().toISOString(),
      app: 'appteste'
    }), 'utf8');
    log.info('Arquivo de lock do quiosque criado:', KIOSK_LOCK_FILE);
  } catch (error) {
    log.error('Erro ao criar arquivo de lock:', error.message);
  }
}

// Função para monitorar exclusão do arquivo de lock
function watchKioskLockFile() {
  try {
    // Se o arquivo não existe, cria
    if (!fs.existsSync(KIOSK_LOCK_FILE)) {
      createKioskLockFile();
    }

    // Monitora mudanças no diretório do arquivo
    const dir = path.dirname(KIOSK_LOCK_FILE);
    kioskLockWatcher = fs.watch(dir, { recursive: false }, (eventType, filename) => {
      // Verifica se o arquivo de lock foi deletado
      if (filename === path.basename(KIOSK_LOCK_FILE) && !fs.existsSync(KIOSK_LOCK_FILE)) {
        log.warn('Arquivo de lock do quiosque foi deletado - encerrando aplicação');
        kioskEnabled = false;
        // Aguarda um pouco para garantir que tudo seja processado
        setTimeout(() => {
          app.quit();
        }, 500);
      }
    });
  } catch (error) {
    log.error('Erro ao monitorar arquivo de lock:', error.message);
  }
}

// Função para inicializar os serviços de arquivos
async function initializeFileServices() {
  const uploadsPath = path.join(__dirname, 'uploads');
  if (!fileApiServer) {
    fileApiServer = new FileApiServer(uploadsPath);
    await fileApiServer.start();
  }
  if (!fileService) {
    fileService = new FileService(uploadsPath);
  }
}

// Função para configurar inicialização automática no Windows
function setupWindowsAutoStart() {
  if (process.platform !== 'win32') return;

  try {
    const Registry = require('winreg');
    const regKey = new Registry({
      hive: Registry.HKLM,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      arch: 'x64'
    });

    const exePath = app.getPath('exe');
    regKey.set('AppTeste', Registry.REG_SZ, exePath, function (err) {
      if (err) {
        log.error('Erro ao configurar autostart:', err.message);
      } else {
        log.info('Aplicação configurada para iniciar automaticamente no Windows');
      }
    });
  } catch (error) {
    log.warn('Não foi possível configurar autostart (pode ser necessário executar como admin):', error.message);
  }
}


/**
 * Cria a janela principal da aplicação.
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    show: false,
    backgroundColor: '#1e1e1e',
    kiosk: true,
    fullscreenable: false,
    autoHideMenuBar: true,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Hardened defaults
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
      webviewTag: false,
      disableDialogs: true,
      spellcheck: false,
      navigateOnDragDrop: false,
      allowRunningInsecureContent: false
    }
  });

  const startUrl =
    process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, 'renderer', 'pages', 'login', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // ✨ NOVO: Ativar fullscreen APÓS mostrar janela
    mainWindow.setFullScreen(true);
  });

  mainWindow.on('close', (event) => {
    // Em modo quiosque, impede fechamento normal
    if (kioskEnabled) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // ✨ NOVO: Impedir sair de fullscreen
  mainWindow.on('leave-full-screen', () => {
    if (kioskEnabled) {
      setTimeout(() => {
        mainWindow.setFullScreen(true);
      }, 100);
    }
  });

  // ✨ NOVO: Impedir minimize em quiosque
  mainWindow.on('minimize', (event) => {
    if (kioskEnabled) {
      event.preventDefault();
      mainWindow.show();
    }
  });

  // Bloqueia atalhos de teclado perigosos para modo kiosk
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Bloqueia Alt+F4, Ctrl+Q, Ctrl+W (fechar)
    if (
      (input.control && input.key.toLowerCase() === 'q') ||
      (input.control && input.key.toLowerCase() === 'w') ||
      (input.alt && input.key.toLowerCase() === 'f4') ||
      // Bloqueia F11 (fullscreen toggle)
      input.key === 'F11' ||
      // Bloqueia Ctrl+Shift+I, Ctrl+Shift+C (DevTools)
      (input.control && input.shift && input.key === 'I') ||
      (input.control && input.shift && input.key === 'C') ||
      // Bloqueia F12 (DevTools)
      input.key === 'F12' ||
      // ✨ NOVO: Bloqueia F10 (menu)
      input.key === 'F10' ||
      // ✨ NOVO: Bloqueia Alt (menu)
      (input.alt && !input.key) ||
      // ✨ NOVO: Bloqueia Super (Windows key)
      input.meta ||
      // ✨ NOVO: Bloqueia Escape em quiosque
      (kioskEnabled && input.key === 'Escape')
    ) {
      event.preventDefault();
    }
  });

  // Block unexpected navigations and window openings; open external links in default browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only allow http/https to be opened externally, never in-app
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Prevent navigation away from our app files.
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  return mainWindow;
}

/**
 * Cria uma janela flutuante para controle de sessão (modo lanhouse)
 */
function createSessionWindow() {
  const sessionWindow = new BrowserWindow({
    width: 340,
    height: 300,
    x: 20,
    y: 20,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    minimizable: true,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Same hardened defaults
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !!isDev,
      webviewTag: false,
      disableDialogs: true,
      spellcheck: false,
      navigateOnDragDrop: false,
      allowRunningInsecureContent: false
    }
  });

  const sessionUrl = `file://${path.join(
    __dirname,
    'renderer',
    'pages',
    'session',
    'session-widget.html'
  )}`;
  sessionWindow.loadURL(sessionUrl);

  sessionWindow.once('ready-to-show', () => {
    sessionWindow.show();
    sessionWindow.setAlwaysOnTop(true, 'screen-saver');
  });

  // Gerencia prioridade ao minimizar/restaurar
  sessionWindow.on('minimize', () => {
    sessionWindow.setAlwaysOnTop(false);
  });
  sessionWindow.on('restore', () => {
    sessionWindow.setAlwaysOnTop(true, 'screen-saver');
  });

  return sessionWindow;
}


// Single instance lock to avoid duplicates
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(async () => {
    app.on('second-instance', () => {
      // Focus existing window if a second instance is attempted
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });

    safeHandle('ping', () => 'pong');

    safeHandle('auth:unlock', async (_event, credentials) => {
      const result = await authService.authenticate(credentials);
      if (result.success && result.user) {
        sessionWindow = startSession({
          user: result.user,
          log,
          authService,
          mainWindow,
          isDev,
          setCurrentUser: (u) => { currentUser = u; },
          setSessionTimer: (t) => { sessionTimer = t; },
          createSessionWindow
        });
      }
      return result;
    });

    safeHandle('auth:unlock-complete', (_, payload) => releaseWorkstation({
      log,
      mainWindow,
      sessionWindow,
      sessionTimer,
      isDev,
      setCurrentUser: (u) => { currentUser = u; },
      setSessionTimer: (t) => { sessionTimer = t; }
    }));

    safeHandle('window:resize', (event, { width, height }) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.setSize(width, height);
        // Ensure it stays on top after resize
        window.setAlwaysOnTop(true, 'screen-saver');
      }
    });
    safeHandle('window:minimize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.minimize();
        window.setAlwaysOnTop(false);
      }
    });
    safeHandle('window:close', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.close();
      }
    });
    safeHandle('session:end', async () => {
      try {
        // Fecha a janela de sessão se existir
        if (sessionWindow && !sessionWindow.isDestroyed()) {
          sessionWindow.destroy();
          sessionWindow = null;
        }

        // Limpa sessão e reabre login
        currentUser = null;
        if (sessionTimer) {
          clearTimeout(sessionTimer);
          sessionTimer = null;
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          await mainWindow.loadURL(
            `file://${path.join(__dirname, 'renderer', 'pages', 'login', 'index.html')}`
          );
          // Mantém kiosk sempre ativo em produção
          mainWindow.setKiosk(true);
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message };
      }
    });

    safeHandle('config:get', () => {
      const context = authService.getContext();
      return {
        ...context,
        currentUser
      };
    });

    // Handler para obter informações do quiosque
    safeHandle('kiosk:status', () => {
      return {
        enabled: kioskEnabled,
        lockFilePath: KIOSK_LOCK_FILE,
        exists: fs.existsSync(KIOSK_LOCK_FILE)
      };
    });

    // Handlers para o sistema de arquivos
    safeHandle('files:get-api-info', () => {
      if (!fileApiServer) {
        return { success: false, error: 'Servidor de arquivos não inicializado' };
      }
      return {
        success: true,
        port: fileApiServer.getPort(),
        baseUrl: `http://localhost:${fileApiServer.getPort()}`,
        uploadsPath: fileApiServer.getUploadsPath()
      };
    });

    safeHandle('files:get-stats', async () => {
      if (!fileService) {
        return { success: false, error: 'Serviço de arquivos não inicializado' };
      }
      const stats = await fileService.getStats();
      return { success: true, stats };
    });

    safeHandle('files:search-by-tags', async (_, tags) => {
      if (!fileService) {
        return { success: false, error: 'Serviço de arquivos não inicializado' };
      }
      const files = await fileService.searchByTags(tags);
      return { success: true, files };
    });

    safeHandle('files:update-tags', async (_, filename, tags) => {
      if (!fileService) {
        return { success: false, error: 'Serviço de arquivos não inicializado' };
      }
      const success = await fileService.updateFileTags(filename, tags);
      return { success };
    });

    safeHandle('files:cleanup-old', async (_, daysOld = 30) => {
      if (!fileService) {
        return { success: false, error: 'Serviço de arquivos não inicializado' };
      }
      const removedFiles = await fileService.cleanupOldFiles(daysOld);
      return { success: true, removedFiles };
    });

    authService.on('context-changed', (context) => {
      BrowserWindow.getAllWindows().forEach((windowInstance) => {
        windowInstance.webContents.send('app:context-updated', {
          ...context,
          currentUser
        });
      });
    });

    authService.initialize();

    // Inicializar serviços de arquivo
    await initializeFileServices();

    // Criar arquivo de lock e monitorar
    createKioskLockFile();
    watchKioskLockFile();

    // Tentar configurar autostart no Windows
    if (!isDev) {
      setupWindowsAutoStart();
    }

    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', async () => {
  // Limpar watcher do arquivo de lock
  if (kioskLockWatcher) {
    kioskLockWatcher.close();
  }
  
  authService.shutdown();
  await shutdownFileServices();
});
