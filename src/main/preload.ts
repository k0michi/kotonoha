import { ipcRenderer, contextBridge } from 'electron';

export class Bridge {
  readDeckIDs = (): Promise<string[]> => ipcRenderer.invoke('read-deck-ids');
  readDeck = (id: string): Promise<string> => ipcRenderer.invoke('read-deck', id);
  writeDeck = (id: string, deck: string): Promise<void> => ipcRenderer.invoke('write-deck', id, deck);
  readScoreSheet = (id: string): Promise<string> => ipcRenderer.invoke('read-scoresheet', id);
  writeScoreSheet = (id: string, scoreSheet: string): Promise<void> => ipcRenderer.invoke('write-scoresheet', id, scoreSheet);
}

contextBridge.exposeInMainWorld('bridge', new Bridge());