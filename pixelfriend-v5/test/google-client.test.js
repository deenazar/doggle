'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const packageClient = require('../build/package-google-client');
const { readDesktopClient } = require('../studio/google-client');
const { Google } = require('../agent/google');

test('packaging stages only desktop registration fields where the Mac runtime reads them', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'toggle-build-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'source.json');
  const installed = { client_id: 'test.apps.googleusercontent.com', client_secret: 'sample' };
  await fs.writeFile(file, JSON.stringify({ installed: { ...installed, project_id: 'test' }, tokens: 'dummy' }));
  const before = process.env.TOGGLE_GOOGLE_CLIENT_FILE;
  process.env.TOGGLE_GOOGLE_CLIENT_FILE = file;
  t.after(() => { if (before === undefined) delete process.env.TOGGLE_GOOGLE_CLIENT_FILE; else process.env.TOGGLE_GOOGLE_CLIENT_FILE = before; });
  const resources = path.join(dir, 'Toggle.app/Contents/Resources');
  await fs.mkdir(resources, { recursive: true });
  await packageClient({ appOutDir: dir, electronPlatformName: 'darwin', packager: { appInfo: { productFilename: 'Toggle' } } });
  const output = path.join(resources, 'google-client.json');
  assert.deepEqual(JSON.parse(await fs.readFile(output)), { installed });
  assert.deepEqual(await readDesktopClient(output), installed);
  await fs.writeFile(file, JSON.stringify({ web: installed }));
  await assert.rejects(readDesktopClient(file));
});

test('leaving browser sign-in for guest mode stores no tokens', async () => {
  const controller = new AbortController();
  let stored = false;
  const google = new Google({ write: () => { stored = true; }, openExternal: async url => {
    const scopes = new URL(url).searchParams.get('scope').split(' ');
    assert.equal(scopes.length, 3);
    controller.abort();
  } });
  await assert.rejects(google.connect('test.apps.googleusercontent.com', 'sample', controller.signal), /cancelled/);
  assert.equal(stored, false);
  assert.equal(google.connecting, false);
});

test('one browser consent grants Gmail read/send and Calendar read before saving the session', async t => {
  const http = require('node:http');
  const scopes = ['gmail.readonly', 'gmail.send', 'calendar.events.readonly'].map(s => 'https://www.googleapis.com/auth/' + s);
  let granted = scopes.slice(0, 2);
  let saved;
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://oauth2.googleapis.com/token');
    assert.equal(options.body.get('code'), 'example');
    assert.ok(options.body.get('code_verifier'));
    return { ok: true, json: async () => ({ scope: granted.join(' '), access_token: 'example', refresh_token: 'test-refresh', expires_in: 3600 }) };
  });
  const google = new Google({
    write: async value => { saved = value; },
    openExternal: async url => {
      const params = new URL(url).searchParams;
      assert.deepEqual(params.get('scope').split(' '), scopes);
      const callback = new URL(params.get('redirect_uri'));
      callback.search = new URLSearchParams({ code: 'example', state: params.get('state') });
      await new Promise((resolve, reject) => {
        http.get(callback, res => { res.resume(); res.on('end', resolve); }).on('error', reject);
      });
    }
  });
  await assert.rejects(google.connect('test.apps.googleusercontent.com', 'sample'), /three requested permissions/);
  assert.equal(saved, undefined);
  granted = scopes;
  await google.connect('test.apps.googleusercontent.com', 'sample');
  assert.equal(saved.refresh_token, 'test-refresh');
});
