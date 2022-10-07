// Modules to control application life and create native browser window

import { app, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  } else {
    const url = `http://localhost:5173/`;
    mainWindow.loadURL(url);
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const userData = app.getPath('userData');
const decksDir = path.join(userData, 'decks');
const scoreSheetsDir = path.join(userData, 'scoresheets');

ipcMain.handle('read-deck-ids', async (e) => {
  let ids: string[] = [];

  try {
    ids = (await fs.readdir(decksDir)).filter(f => f.endsWith('.xml')).map(f => f.substring(0, f.lastIndexOf('.')));
  } catch (e) {
  }

  return ids;
});

ipcMain.handle('read-deck', async (e, id: string) => {
  const src = path.join(decksDir, id + '.xml');
  return await fs.readFile(src, 'utf-8');
});

ipcMain.handle('write-deck', async (e, id: string, deck: string) => {
  await fs.mkdir(decksDir, { recursive: true });
  const dest = path.join(decksDir, id + '.xml');
  await fs.writeFile(dest, deck);
});

ipcMain.handle('read-scoresheet', async (e, id: string) => {
  const src = path.join(scoreSheetsDir, id + '.json');
  return await fs.readFile(src, 'utf-8');
});

ipcMain.handle('write-scoresheet', async (e, id: string, scoresheet: string) => {
  await fs.mkdir(scoreSheetsDir, { recursive: true });
  const dest = path.join(scoreSheetsDir, id + '.json');
  await fs.writeFile(dest, scoresheet);
});