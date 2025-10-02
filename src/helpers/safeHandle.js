// helpers/safeHandle.js
const { ipcMain } = require('electron');

function safeHandle(channel, handler, log) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const result = await handler(event, ...args);
      return result;
    } catch (error) {
      if (log) log.error(`IPC '${channel}' falhou`, { error: error?.message });
      return { ok: false, success: false, error: error?.message || 'Erro inesperado.' };
    }
  });
}

module.exports = { safeHandle };