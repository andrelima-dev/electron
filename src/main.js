const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const authService = require('./services/auth-service');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let sessionWindow;
let currentUser = null;
let sessionTimer = null;

function releaseWorkstation(payload = {}) {
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
    mainWindow.loadURL(`file://${path.join(__dirname, 'renderer', 'index.html')}`);
    
    if (!isDev) {
      mainWindow.setKiosk(true);
    }
  }

  return { released: true };
}

function startSession(user) {
  currentUser = user;
  
  // Auto logout timer based on user type
  const sessionDuration = user.type === 'advogado' ? 180 * 60 * 1000 : 120 * 60 * 1000; // minutes to milliseconds
  
  if (sessionTimer) {
    clearTimeout(sessionTimer);
  }
  
  sessionTimer = setTimeout(() => {
    console.log('[main] Sessão expirada automaticamente');
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
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const startUrl = process.env.ELECTRON_START_URL
    || `file://${path.join(__dirname, 'renderer', 'index.html')}`;

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
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const sessionUrl = `file://${path.join(__dirname, 'renderer', 'session-widget.html')}`;
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

app.whenReady().then(() => {
  ipcMain.handle('ping', () => 'pong');

  ipcMain.handle('auth:unlock', async (_event, credentials) => {
    const result = await authService.authenticate(credentials);
    if (result.success && result.user) {
      startSession(result.user);
    }
    return result;
  });

  ipcMain.handle('auth:unlock-complete', (_, payload) => releaseWorkstation(payload));
  
  ipcMain.handle('window:resize', (event, { width, height }) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.setSize(width, height);
      // Ensure it stays on top after resize
      window.setAlwaysOnTop(true, 'screen-saver');
    }
  });
  ipcMain.handle('window:minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.minimize();
      window.setAlwaysOnTop(false);
    }
  });
  ipcMain.handle('window:close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.close();
    }
  });
  ipcMain.handle('session:end', async () => {
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
        await mainWindow.loadURL(`file://${path.join(__dirname, 'renderer', 'index.html')}`);
        if (!isDev) mainWindow.setKiosk(true);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  });
  
  ipcMain.handle('config:get', () => {
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  authService.shutdown();
});
