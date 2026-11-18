'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Google } = require('../agent/google');
const { publisherRegistration } = require('../studio/google-client');

test('release registration uses only the publisher identity and needs no end-user file', () => {
  const env = { TOGGLE_GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com', TOGGLE_GOOGLE_CLIENT_SECRET: 'sample', refresh_token: 'ignore' };
  assert.deepEqual(publisherRegistration(env), { clientId: env.TOGGLE_GOOGLE_CLIENT_ID, clientSecret: 'sample' });
  assert.throws(() => publisherRegistration({}), /publisher/);
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
      assert.equal(params.get('prompt'), 'select_account consent');
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
