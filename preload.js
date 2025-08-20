const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  onTranslationUpdate: (cb) => ipcRenderer.on('translation:update', (_evt, data) => cb(data)),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (payload) => ipcRenderer.send('settings:update', payload),
  resizePopup: (size) => ipcRenderer.send('popup:resize', size),
});