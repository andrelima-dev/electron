const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  versions: () => process.versions,
  ping: () => ipcRenderer.invoke('ping'),
  unlock: (credentials) => ipcRenderer.invoke('auth:unlock', credentials),
  releaseWorkstation: (payload) => ipcRenderer.invoke('auth:unlock-complete', payload),
  getAppContext: () => ipcRenderer.invoke('config:get'),
  resizeWindow: (width, height) => ipcRenderer.invoke('window:resize', { width, height }),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  endSession: () => ipcRenderer.invoke('session:end'),
  onContextUpdated: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const channel = 'app:context-updated';
    const listener = (_event, context) => callback(context);

    ipcRenderer.on(channel, listener);

    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  }
});

// API para sistema de arquivos
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});
