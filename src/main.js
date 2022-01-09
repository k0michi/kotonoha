import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';

const config = {
  decksPath: path.join(app.getPath('userData'), 'decks')
};

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile(`${__dirname}/index.html`)

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})


ipcMain.handle('open-file', async (e) => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });

  if (!result.canceled) {
    return result.filePaths[0];
  } else {
    return null;
  }
});

ipcMain.handle('read-file', async (e, filePath) => {
  return await fs.readFile(filePath, { encoding: 'utf-8' });
});

ipcMain.handle('get-config', (e) => {
  return config;
});

ipcMain.handle('save-file', async (e, filePath, data) => {
  return await fs.writeFile(filePath, data);
});

ipcMain.handle('read-dir', async (e, dirPath) => {
  try {
    const dir = await fs.opendir(dirPath);
    const ents = [];

    for await (const dirent of dir) {
      if (dirent.isFile()) {
        ents.push(path.join(dirPath, dirent.name));
      }
    }

    return ents;
  } catch (e) {
    return null;
  }
});

ipcMain.handle('make-dir', async (e, dirPath) => {
  return await fs.mkdir(dirPath, { recursive: true });
});