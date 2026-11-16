// PixelFriend — main process
// One transparent, click-through window covers the whole screen so the avatar can roam anywhere.
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, Notification, safeStorage, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs/promises');
const { AgentService } = require('./agent/service');

let win, tray, agentWindow, agentService;
function secureWindow(window) {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
}
function openAgent() {
  if (agentWindow && !agentWindow.isDestroyed()) { agentWindow.show(); agentWindow.focus(); return; }
  agentWindow = new BrowserWindow({ width: 900, height: 820, minWidth: 620, minHeight: 500,
    title: 'PixelFriend Personal Agent', backgroundColor: '#12151c',
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

function createWindow() {
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
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  screen.on('display-metrics-changed', fit);
  screen.on('display-added', fit);
  screen.on('display-removed', fit);
}

function trayIcon() {
  const s = 16, buf = Buffer.alloc(s * s * 4);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const inCircle = (x - 8) ** 2 + (y - 10) ** 2 <= 30;
    const inTip = y >= 1 && y < 10 && Math.abs(x - 7.5) <= (y - 1) * 0.6;
    const i = (y * s + x) * 4;
    if (inCircle || inTip) { buf[i] = 244; buf[i + 1] = 133; buf[i + 2] = 66; buf[i + 3] = 255; }
  }
  return nativeImage.createFromBitmap(buf, { width: s, height: s });
}

function buildTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip('PixelFriend');
  const send = (ch) => () => { win.show(); win.webContents.send('pf:' + ch); };
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Personal Agent · தமிழ் chat…', click: openAgent },
    { type: 'separator' },
    { label: 'I drank water 💧', click: send('drink') },
    { label: 'Remind me now (test)', click: send('remind') },
    { label: 'Run around 🏃', click: send('run') },
    { label: 'Stats 📊', click: send('stats') },
    { label: 'Customize…', click: send('settings') },
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
  if (win && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame) openAgent();
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
      if (Notification.isSupported()) { const n = new Notification({ title, body }); n.on('click', openAgent); n.show(); }
    } });
  await agentService.init();
  registerAgent();
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  createWindow();
  buildTray();
});
app.on('before-quit', () => clearInterval(agentService?.timer));
app.on('window-all-closed', (e) => e.preventDefault());
