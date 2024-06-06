const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    startBot: (config) => ipcRenderer.invoke('start-bot', config),
    stopBot: () => ipcRenderer.invoke('stop-bot')
});
