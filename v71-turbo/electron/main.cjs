const { app, BrowserWindow, dialog, ipcMain, Notification, shell } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')

const BACKUP_FOLDER = 'Beton fuvar mentések'

function validateFileName(fileName) {
  if (typeof fileName !== 'string' || path.basename(fileName) !== fileName
    || !/^[a-zA-Z0-9._-]+\.(json|xlsx)$/.test(fileName)) {
    throw new Error('A mentés fájlneve érvénytelen.')
  }
  return fileName
}

function validateSender(event) {
  if (!event.senderFrame?.url.startsWith('file://')) {
    throw new Error('A mentés csak a telepített alkalmazásból indítható.')
  }
}

ipcMain.handle('notification:data-change', (event, title, message) => {
  validateSender(event)
  if (typeof title !== 'string' || title.length > 120
    || typeof message !== 'string' || message.length > 500) {
    throw new Error('Az értesítés szövege érvénytelen.')
  }
  shell.beep()
  if (Notification.isSupported()) {
    new Notification({ title, body: message, silent: true }).show()
  } else {
    return dialog.showMessageBox({ type: 'info', title, message, buttons: ['Rendben'] })
  }
})

ipcMain.handle('backup:save-file', async (event, fileName, contents, encoding = 'utf8') => {
  validateSender(event)
  const safeName = validateFileName(fileName)
  if (typeof contents !== 'string' || contents.length > 70_000_000
    || (encoding !== 'utf8' && encoding !== 'base64')) {
    throw new Error('A mentés tartalma érvénytelen vagy túl nagy.')
  }
  if (encoding === 'base64' && (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contents))) {
    throw new Error('Az Excel-mentés kódolása érvénytelen.')
  }

  const folder = path.join(app.getPath('documents'), BACKUP_FOLDER)
  await fs.mkdir(folder, { recursive: true })
  const filePath = path.join(folder, safeName)
  await fs.writeFile(filePath, contents, encoding)
  return filePath
})

ipcMain.handle('backup:open-folder', async (event) => {
  validateSender(event)
  const folder = path.join(app.getPath('documents'), BACKUP_FOLDER)
  await fs.mkdir(folder, { recursive: true })
  const error = await shell.openPath(folder)
  if (error) throw new Error(`Nem sikerült megnyitni a mentések mappáját: ${error}`)
  return folder
})

function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 360,
    minHeight: 560,
    title: 'Beton fuvar',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
