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
const path = require('node:path');
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


/**
 * Cria a janela principal da aplicação.
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#1e1e1e',
    kiosk: !isDev,
    fullscreenable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Hardened defaults
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

  const startUrl =
    process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, 'renderer', 'pages', 'login', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
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

// Funções auxiliares importadas dos helpers
const { safeHandle } = require('./helpers/safeHandle');
const { releaseWorkstation, startSession } = require('./helpers/sessionManager');


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
          if (!isDev) mainWindow.setKiosk(true);
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
  authService.shutdown();
  await shutdownFileServices();
});
