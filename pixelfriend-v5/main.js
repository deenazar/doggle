// PixelFriend — main process
// One transparent, click-through window covers the whole screen so the avatar can roam anywhere.
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, dialog, Notification, safeStorage, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs/promises');
const { AgentService } = require('./agent/service');
const { registerStudio } = require('./studio/backend');
// Keep the original data location across the display-name change.
const legacyData = ['PixelFriend', 'pixelfriend'].map(name => path.join(app.getPath('appData'), name)).find(p => require('node:fs').existsSync(p));
app.setPath('userData', legacyData || path.join(app.getPath('appData'), 'PixelFriend'));
app.setName('Toggle');

let win, tray, agentWindow, agentService, studioWindow;
function openStudio() {
  if (studioWindow && !studioWindow.isDestroyed()) { studioWindow.show(); studioWindow.focus(); return; }
  studioWindow = new BrowserWindow({ width: 1280, height: 940, minWidth: 740, minHeight: 660,
    title: 'Toggle — Your desktop, a little more alive', backgroundColor: '#fbfdff',
    webPreferences: { preload: path.join(__dirname, 'studio-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  secureWindow(studioWindow);
  studioWindow.loadFile(path.join(__dirname, 'renderer', 'studio.html'));
  studioWindow.on('closed', () => { studioWindow = null; });
}
function secureWindow(window) {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
}
function openAgent() {
  if (agentWindow && !agentWindow.isDestroyed()) { agentWindow.show(); agentWindow.focus(); return; }
  agentWindow = new BrowserWindow({ width: 900, height: 820, minWidth: 620, minHeight: 500,
    title: 'Toggle Personal Agent', backgroundColor: '#12151c',
    webPreferences: { preload: path.join(__dirname, 'agent-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  secureWindow(agentWindow);
  agentWindow.loadFile(path.join(__dirname, 'renderer', 'agent.html'));
  agentWindow.on('closed', () => { agentWindow = null; });
}
function registerAgent() {
  const handlers = {
    places: city => agentService.findPlaces(city),
    state: () => agentService.state(), models: () => agentService.models(),
    chat: message => agentService.chat(message), configure: config => agentService.configure(config),
    connect: async (id, secret) => {
      if (!agentService.encryptedAvailable()) throw new Error('Secure OS credential storage is unavailable.');
      if (typeof id !== 'string' || typeof secret !== 'string' || id.length > 300 || secret.length > 300) throw new Error('Invalid Google client credentials');
      await agentService.google.connect(id, secret); return agentService.state();
    },
    disconnect: () => agentService.disconnect(), approve: (id, edits) => agentService.approve(id, edits),
    cancel: id => agentService.cancel(id), notes: async () => {
      const folder = path.join(agentService.directory, 'notes'); await fs.mkdir(folder, { recursive: true });
      const error = await shell.openPath(folder); if (error) throw new Error(error);
    }
  };
  const agentURL = pathToFileURL(path.join(__dirname, 'renderer', 'agent.html')).href;
  for (const [name, handler] of Object.entries(handlers)) ipcMain.handle('agent:' + name, async (event, ...args) => {
    try {
      if (!agentWindow || event.sender !== agentWindow.webContents || event.senderFrame !== agentWindow.webContents.mainFrame || event.senderFrame.url !== agentURL) throw new Error('Unauthorized agent request');
      return { ok: true, value: await handler(...args) };
    } catch (e) { return { ok: false, error: e.message }; }
  });
}

function fit() {
  const { workArea } = screen.getPrimaryDisplay();
  win.setBounds(workArea);
}

async function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    ...workArea,
    transparent: true, frame: false, resizable: false, movable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, roundedCorners: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, backgroundThrottling: false }
  });
  secureWindow(win);
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  await win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  screen.on('display-metrics-changed', fit);
  screen.on('display-added', fit);
  screen.on('display-removed', fit);
}

function trayIcon() {
  return nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png')).resize({ width: 18, height: 18 });
}

function buildTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip('Toggle');
  const send = (ch) => () => { win.show(); win.webContents.send('pf:' + ch); };
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Toggle Studio…', click: openStudio },
    { type: 'separator' },
    { label: 'I drank water 💧', click: send('drink') },
    { label: 'Remind me now (test)', click: send('remind') },
    { label: 'Run around 🏃', click: send('run') },
    { label: 'Stats 📊', click: send('stats') },
    { label: 'Customize…', click: openStudio },
    { type: 'separator' },
    { label: 'Hide for 1 hour', click: send('hide') },
    { label: 'Show / Hide buddy', click: () => win.isVisible() ? win.hide() : win.show() },
    { label: 'Start with computer', type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) },
    { label: 'Quit', click: () => app.quit() }
  ]));
}

ipcMain.on('pf:agent', event => {
  if (win && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame) openStudio();
});
ipcMain.on('pf:ignore', (_e, ignore) => win.setIgnoreMouseEvents(ignore, { forward: true }));
ipcMain.on('pf:focus', () => { win.setIgnoreMouseEvents(false); win.focus(); });
ipcMain.on('pf:notify', (_e, { title, body }) => {
  if (Notification.isSupported()) new Notification({ title, body, silent: true }).show();
});

app.whenReady().then(async () => {
  agentService = new AgentService({ directory: path.join(app.getPath('userData'), 'personal-agent'), downloads: app.getPath('downloads'), safeStorage,
    openExternal: url => shell.openExternal(url), notify: (title, body) => {
      if (win && !win.isDestroyed()) win.webContents.send('pf:agent-alert', { title, body });
      if (Notification.isSupported()) { const n = new Notification({ title, body }); n.on('click', openStudio); n.show(); }
    } });
  await agentService.init();
  registerAgent();
  registerStudio({ ipcMain, shell, dialog, localClientFile: app.isPackaged ? null : path.join(__dirname, '.local', 'google-client.json'), getWindow: () => studioWindow, getBuddy: () => win, service: agentService });
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  await createWindow();
  buildTray();
  openStudio();
});
app.on('activate', () => { if (app.isReady() && win) openStudio(); });
app.on('before-quit', () => clearInterval(agentService?.timer));
app.on('window-all-closed', (e) => e.preventDefault());
