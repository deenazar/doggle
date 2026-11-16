'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const files = require('../agent/files');
const { AgentService, TOOLS } = require('../agent/service');
const { Google, validateDraft } = require('../agent/google');
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pixelfriend-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const downloads = path.join(directory, 'Downloads'); await fs.mkdir(downloads);
  const service = new AgentService({ directory: path.join(directory, 'agent'), downloads, safeStorage: { isEncryptionAvailable: () => false }, notify: () => {}, openExternal: async () => {} });
  await service.init(); t.after(() => clearInterval(service.timer));
  return { directory, downloads, service };
}
async function oldFile(root, name, content = 'original') { const file = path.join(root, name); await fs.writeFile(file, content); await fs.utimes(file, new Date(0), new Date(0)); return file; }
const draft = { to: 'one@example.com', subject: 'Meeting', body: 'Draft' };
test('preview is read-only and skips symlinks, active files, directories and unknown types', async t => {
  const { downloads } = await fixture(t); await oldFile(downloads, 'a.pdf'); await oldFile(downloads, 'unknown.foo');
  await fs.writeFile(path.join(downloads, 'new.pdf'), 'new'); await fs.mkdir(path.join(downloads, 'folder.pdf'));
  await fs.symlink(path.join(downloads, 'a.pdf'), path.join(downloads, 'linked.pdf'));
  assert.deepEqual((await files.preview(downloads)).moves.map(m => m.name), ['a.pdf']);
  assert.equal(await fs.readFile(path.join(downloads, 'a.pdf'), 'utf8'), 'original');
});
test('move preserves contents and never overwrites collisions', async t => {
  const { downloads } = await fixture(t); await oldFile(downloads, 'a.pdf'); await oldFile(downloads, 'b.pdf');
  const plan = await files.preview(downloads); await fs.mkdir(path.join(downloads, 'Documents')); await fs.writeFile(path.join(downloads, 'Documents', 'b.pdf'), 'existing');
  const r = await files.execute(plan); assert.equal(r.moved.length, 1); assert.equal(r.skipped.length, 1);
  assert.equal(await fs.readFile(path.join(downloads, 'Documents', 'a.pdf'), 'utf8'), 'original');
  assert.equal(await fs.readFile(path.join(downloads, 'Documents', 'b.pdf'), 'utf8'), 'existing');
  assert.equal(await fs.readFile(path.join(downloads, 'b.pdf'), 'utf8'), 'original');
});
test('changed files and symlink destinations are not moved', async t => {
  const { downloads, directory } = await fixture(t); const a = await oldFile(downloads, 'a.pdf');
  const plan = await files.preview(downloads); await fs.writeFile(a, 'changed'); assert.equal((await files.execute(plan)).moved.length, 0);
  await oldFile(downloads, 'a.pdf'); const next = await files.preview(downloads);
  await fs.symlink(directory, path.join(downloads, 'Documents')); assert.equal((await files.execute(next)).moved.length, 0);
});
test('notes use generated filenames and preserve Tamil', async t => {
  const { service } = await fixture(t); const r = await service.tool('save_note', { title: '../../escape', body: 'தமிழ் குறிப்பு' });
  assert.equal(path.basename(r.file), r.file); assert.match((await service.tool('list_notes', {}))[0].text, /தமிழ் குறிப்பு/);
});
test('email needs approval, uses edited content and cannot replay', async t => {
  const { service } = await fixture(t); const sends = []; service.google.send = async d => { sends.push(d); return { id: 'message-id' }; };
  const p = await service.tool('draft_email', draft); assert.equal(sends.length, 0);
  const edited = { ...draft, body: 'Approved தமிழ் message' };
  assert.equal((await service.approve(p.id, edited)).status, 'sent'); assert.deepEqual(sends, [edited]);
  await assert.rejects(service.approve(p.id, edited), /already used/);
  assert.ok(!TOOLS.some(t => /send|approve|shell|execute/.test(t.function.name)));
  await assert.rejects(service.tool('send_email', draft), /Unsupported/);
});
test('expired and cancelled approvals cannot execute', async t => {
  const { service } = await fixture(t); const first = await service.tool('draft_email', draft); service.pending.get(first.id).expiresAt = 0;
  await assert.rejects(service.approve(first.id, draft), /expired/);
  const second = await service.tool('draft_email', draft); service.cancel(second.id); await assert.rejects(service.approve(second.id, draft));
});
test('uncertain email delivery is not automatically retried', async t => {
  const { service } = await fixture(t); let count = 0; service.google.send = async () => { count++; throw new Error('Lost connection'); };
  const p = await service.tool('draft_email', draft); await assert.rejects(service.approve(p.id, draft), /Check Gmail Sent/);
  await assert.rejects(service.approve(p.id, draft)); assert.equal(count, 1);
});
test('email rejects header injection and encodes Tamil MIME', async () => {
  assert.throws(() => validateDraft({ ...draft, to: 'one@example.com\r\nBcc: other@example.com' }));
  assert.throws(() => validateDraft({ ...draft, subject: 'hello\r\nBcc: bad' }));
  const google = new Google({}); let mime;
  google.api = async (url, opts) => { mime = Buffer.from(JSON.parse(opts.body).raw, 'base64url').toString(); return { id: '1' }; };
  await google.send({ ...draft, subject: 'வணக்கம்', body: 'தமிழ்' });
  assert.ok(mime.includes(Buffer.from('வணக்கம்').toString('base64'))); assert.ok(mime.includes(Buffer.from('தமிழ்').toString('base64')));
});
test('credentials fail closed without OS encryption', async t => {
  const { service } = await fixture(t); await assert.rejects(service.writeTokens({ access_token: 'secret' }), /unavailable/);
  await assert.rejects(fs.access(path.join(service.directory, 'google.enc')));
});
test('polling is opt-in, skips old mail and suppresses duplicate notifications', async t => {
  const { service } = await fixture(t); const notices = []; service.notify = (...args) => notices.push(args);
  let calls = 0; let mail = [{ id: 'old', from: 'sender', subject: 'old' }];
  service.google.inbox = async () => { calls++; return mail; };
  const start = new Date(Date.now() + 300000).toISOString();
  service.google.calendar = async () => [{ id: 'event', title: 'Meeting', start }];
  await service.poll(); assert.equal(calls, 0); service.config.notifications = true;
  await service.poll(); assert.equal(notices.length, 1); mail = [...mail, { id: 'new', from: 'sender', subject: 'new' }];
  await service.poll(); await service.poll(); assert.equal(notices.length, 2);
});
test('calendar still works when Gmail polling fails', async t => {
  const { service } = await fixture(t); service.config.notifications = true; const notices = []; service.notify = (...args) => notices.push(args);
  service.google.inbox = async () => { throw new Error('mail unavailable'); };
  service.google.calendar = async () => [{ id: 'event', title: 'Meeting', start: new Date(Date.now() + 300000).toISOString() }];
  await service.poll(); assert.equal(notices.length, 1); assert.match((await service.state()).pollError, /mail unavailable/);
});
test('weather works independently of Google, throttles checks and rearms below threshold', async t => {
  const { service } = await fixture(t); const notices = []; service.notify = (...args) => notices.push(args);
  service.config.weatherAlerts = true; service.config.location = { name: 'Chennai' }; let temperature = 35, checks = 0;
  service.fetchWeather = async () => { checks++; return { location: 'Chennai', current: { temperature_2m: temperature } }; };
  service.google.inbox = async () => { throw new Error('must not run'); };
  await service.poll(); await service.poll(); assert.equal(notices.length, 1); assert.equal(checks, 1);
  service.lastWeatherCheck = 0; temperature = 25; await service.poll();
  service.lastWeatherCheck = 0; temperature = 35; await service.poll(); assert.equal(notices.length, 2);
});
test('local chat completes a tool round without giving the model approval capability', async t => {
  const { service } = await fixture(t); const previous = global.fetch; t.after(() => { global.fetch = previous; });
  let calls = 0;
  global.fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    const request = JSON.parse(options.body); assert.ok(request.messages[0].content.includes('Tamil'));
    calls++;
    return { ok: true, json: async () => calls === 1 ? { message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'draft_email', arguments: draft } }] } } : { message: { role: 'assistant', content: 'Draft தயார். உங்கள் approval தேவை.' } } };
  };
  const result = await service.chat('Draft an email to one@example.com');
  assert.equal(calls, 2); assert.equal(result.state.pending.length, 1); assert.match(result.reply, /approval/);
});
