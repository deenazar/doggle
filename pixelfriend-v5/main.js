// PixelFriend — main process
// One transparent, click-through window covers the whole screen so the avatar can roam anywhere.
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, Notification } = require('electron');
const path = require('path');

let win, tray;

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

ipcMain.on('pf:ignore', (_e, ignore) => win.setIgnoreMouseEvents(ignore, { forward: true }));
ipcMain.on('pf:focus', () => { win.setIgnoreMouseEvents(false); win.focus(); });
ipcMain.on('pf:notify', (_e, { title, body }) => {
  if (Notification.isSupported()) new Notification({ title, body, silent: true }).show();
});

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  createWindow();
  buildTray();
});
app.on('window-all-closed', (e) => e.preventDefault());
