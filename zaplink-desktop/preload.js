import { contextBridge, shell, ipcRenderer } from 'electron';

// Expõe apenas o necessário para o renderer via contextBridge (sem nodeIntegration)
contextBridge.exposeInMainWorld('zaplink', {
    openExternal: (url) => shell.openExternal(url),
    version: '1.0.0',
    onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, info) => cb(info)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_, info) => cb(info))
});
