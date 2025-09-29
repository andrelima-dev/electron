const path = require('node:path');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { createLogger } = require('./common/logger');
const authService = require('./services/auth-service');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let sessionWindow;
let currentUser = null;
let sessionTimer = null;
const log = createLogger('main');

function releaseWorkstation(payload = {}) {
  log.info('Liberando estação de trabalho', payload);
  // Clear session data
  currentUser = null;
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }

  // Close session window if exists
  if (sessionWindow && !sessionWindow.isDestroyed()) {
    sessionWindow.close();
    sessionWindow = null;
  }

  // Show main window and return to login
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.loadURL(
      `file://${path.join(__dirname, 'renderer', 'pages', 'login', 'index.html')}`
    );

    if (!isDev) {
      mainWindow.setKiosk(true);
    }
  }

  return { released: true };
}

function startSession(user) {
  log.info('Iniciando sessão', { user: { name: user?.name, type: user?.type } });
  currentUser = user;

  // Auto logout timer based on user type (driven by config)
  const { session } = authService.state.config || {};
  const advMinutes = Number(session?.advogadoMinutes) > 0 ? Number(session.advogadoMinutes) : 180;
  const estMinutes =
    Number(session?.estagiarioMinutes) > 0 ? Number(session.estagiarioMinutes) : 120;
  const sessionMinutes = user.type === 'advogado' ? advMinutes : estMinutes;
  const sessionDuration = sessionMinutes * 60 * 1000; // minutes to milliseconds

  if (sessionTimer) {
    clearTimeout(sessionTimer);
  }

  sessionTimer = setTimeout(() => {
    log.warn('Sessão expirada automaticamente');
    releaseWorkstation({ reason: 'timeout' });
  }, sessionDuration);

  // Create session control window (small floating widget)
  sessionWindow = createSessionWindow();

  // Exit kiosk mode to allow normal computer usage
  if (mainWindow && !isDev) {
    mainWindow.setKiosk(false);
    mainWindow.hide(); // Hide the main login window
  }
}

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

// Helper: registra um handler com try/catch e logging padronizado.
function safeHandle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const result = await handler(event, ...args);
      return result;
    } catch (error) {
      log.error(`IPC '${channel}' falhou`, { error: error?.message });
      return { ok: false, success: false, error: error?.message || 'Erro inesperado.' };
    }
  });
}

// Single instance lock to avoid duplicates
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
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
        startSession(result.user);
      }
      return result;
    });

    safeHandle('auth:unlock-complete', (_, payload) => releaseWorkstation(payload));

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

    authService.on('context-changed', (context) => {
      BrowserWindow.getAllWindows().forEach((windowInstance) => {
        windowInstance.webContents.send('app:context-updated', {
          ...context,
          currentUser
        });
      });
    });

    authService.initialize();

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

app.on('will-quit', () => {
  authService.shutdown();
});
