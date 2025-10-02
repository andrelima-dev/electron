// helpers/sessionManager.js
const path = require('node:path');
const { BrowserWindow } = require('electron');

function releaseWorkstation({ log, mainWindow, sessionWindow, sessionTimer, isDev, setCurrentUser, setSessionTimer }) {
  log.info('Liberando estação de trabalho');
  setCurrentUser(null);
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    setSessionTimer(null);
  }
  if (sessionWindow && !sessionWindow.isDestroyed()) {
    sessionWindow.close();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.loadURL(`file://${path.join(__dirname, '../renderer/pages/login/index.html')}`);
    if (!isDev) mainWindow.setKiosk(true);
  }
  return { released: true };
}

function startSession({ user, log, authService, mainWindow, isDev, setCurrentUser, setSessionTimer, createSessionWindow }) {
  log.info('Iniciando sessão', { user: { name: user?.name, type: user?.type } });
  setCurrentUser(user);
  const { session } = authService.state.config || {};
  const advMinutes = Number(session?.advogadoMinutes) > 0 ? Number(session.advogadoMinutes) : 180;
  const estMinutes = Number(session?.estagiarioMinutes) > 0 ? Number(session.estagiarioMinutes) : 120;
  const sessionMinutes = user.type === 'advogado' ? advMinutes : estMinutes;
  const sessionDuration = sessionMinutes * 60 * 1000;
  setSessionTimer(setTimeout(() => {
    log.warn('Sessão expirada automaticamente');
    releaseWorkstation({ log, mainWindow, sessionWindow, sessionTimer, isDev, setCurrentUser, setSessionTimer });
  }, sessionDuration));
  const sessionWindow = createSessionWindow();
  if (mainWindow && !isDev) {
    mainWindow.setKiosk(false);
    mainWindow.hide();
  }
  return sessionWindow;
}

function createMainWindow(isDev) {
  // ...código igual ao main.js, pode ser movido aqui...
}

function createSessionWindow(isDev) {
  // ...código igual ao main.js, pode ser movido aqui...
}

module.exports = { releaseWorkstation, startSession, createMainWindow, createSessionWindow };