const { contextBridge, ipcRenderer } = require('electron');
const invoke = (name, ...args) => ipcRenderer.invoke('agent:' + name, ...args).then(result => {
  if (!result.ok) throw new Error(result.error);
  return result.value;
});
contextBridge.exposeInMainWorld('agent', {
  places: city => invoke('places', city),
  state: () => invoke('state'), models: () => invoke('models'),
  chat: text => invoke('chat', text), configure: config => invoke('configure', config),
  connect: () => invoke('connect'), disconnect: () => invoke('disconnect'),
  approve: (id, edits) => invoke('approve', id, edits), cancel: id => invoke('cancel', id),
  notes: () => invoke('notes')
});
