const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopFiles', {
  saveFile: (fileName, contents, encoding) => ipcRenderer.invoke('backup:save-file', fileName, contents, encoding),
  openBackupFolder: () => ipcRenderer.invoke('backup:open-folder')
})
