'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { registerStudio } = require('../studio/backend');

test('Studio loads desktop JSON into OAuth and handles cancellation and invalid client types', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'toggle-client-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'test.json');
  const sample = { client_id: 'sample.apps.googleusercontent.com', client_secret: 'test-secret' };
  let handler, selected = null, calls = [];
  const frame = { url: require('node:url').pathToFileURL(path.resolve(__dirname, '../renderer/studio.html')).href };
  const window = { webContents: { mainFrame: frame }, isDestroyed: () => false };
  registerStudio({
    ipcMain: { handle(name, fn) { if (name === 'studio:connect') handler = fn; } },
    getWindow: () => window,
    localClientFile: path.join(dir, 'local.json'),
    dialog: { showOpenDialog: async () => ({ canceled: !selected, filePaths: [selected] }) },
    service: { encryptedAvailable: () => true, google: { connect: (...args) => calls.push(args) }, state: () => ({ connected: true }) }
  });
  const connect = () => handler({ sender: window.webContents, senderFrame: frame }, '', '');
  assert.deepEqual(await connect(), { ok: true, value: null });
  selected = file;
  await fs.writeFile(file, JSON.stringify({ web: sample }));
  assert.equal((await connect()).ok, false);
  await fs.writeFile(file, JSON.stringify({ installed: sample }));
  assert.deepEqual(await connect(), { ok: true, value: { connected: true } });
  assert.deepEqual(calls, [[sample.client_id, sample.client_secret]]);
  selected = null;
  await fs.rename(file, path.join(dir, 'local.json'));
  assert.equal((await connect()).value.connected, true);
  assert.equal(calls.length, 2);
});
