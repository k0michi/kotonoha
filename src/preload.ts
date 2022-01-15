import {ipcRenderer, contextBridge} from 'electron';
import * as path from 'path';

contextBridge.exposeInMainWorld('bridge', {
  path,

  async openFile(...args) {
    return await ipcRenderer.invoke('open-file',...args);
  },

  async readFile(...args) {
    return await ipcRenderer.invoke('read-file', ...args);
  },

  async getConfig(...args) {
    return await ipcRenderer.invoke('get-config',...args);
  },

  async saveFile(...args) {
    return await ipcRenderer.invoke('save-file',...args);
  },

  async readDir(...args) {
    return await ipcRenderer.invoke('read-dir',...args);
  },

  async makeDir(...args) {
    return await ipcRenderer.invoke('make-dir',...args);
  }
});