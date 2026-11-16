const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pf', {
  openAgent: () => ipcRenderer.send('pf:agent'),
  ignoreMouse: (v) => ipcRenderer.send('pf:ignore', v),
  focus: () => ipcRenderer.send('pf:focus'),
  notify: (title, body) => ipcRenderer.send('pf:notify', { title, body }),
  on: (ch, fn) => ipcRenderer.on('pf:' + ch, (_e, arg) => fn(arg))
});
