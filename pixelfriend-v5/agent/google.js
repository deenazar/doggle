'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.events.readonly';
async function jsonFetch(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`Google request failed (${response.status}): ${data.error?.message || data.error_description || 'Check account permissions'}`);
  return data;
}
class Google {
  constructor({ read, write, openExternal }) { this.read = read; this.write = write; this.openExternal = openExternal; this.connecting = false; }
  async connect(clientId, clientSecret) {
    if (this.connecting) throw new Error('Google sign-in already in progress');
    if (!clientId.endsWith('.apps.googleusercontent.com') || !clientSecret) throw new Error('Enter your Google Desktop OAuth client ID and secret.');
    this.connecting = true;
    const state = crypto.randomBytes(32).toString('base64url');
    const verifier = crypto.randomBytes(48).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    let server, timer;
    try {
      const codePromise = new Promise((resolve, reject) => {
        server = http.createServer((req, res) => {
          const url = new URL(req.url, 'http://127.0.0.1');
          if (url.pathname !== '/callback') { res.writeHead(404).end(); return; }
          if (url.searchParams.get('state') !== state) { res.writeHead(403).end('Invalid sign-in state'); return; }
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          const code = url.searchParams.get('code');
          res.end(code ? 'Authorization received. Return to PixelFriend to check connection status.' : 'Sign-in cancelled. Return to PixelFriend.');
          if (code) resolve(code); else reject(new Error('Google sign-in cancelled'));
        });
        server.on('error', reject);
        timer = setTimeout(() => reject(new Error('Google sign-in timed out. Try again.')), 180000);
      });
      // Attach a rejection handler while waiting for browser launch/listening.
      codePromise.catch(() => {});
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      const redirect = `http://127.0.0.1:${server.address().port}/callback`;
      const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: 'code', scope: SCOPES, state, code_challenge: challenge, code_challenge_method: 'S256', access_type: 'offline', prompt: 'consent' });
      await this.openExternal('https://accounts.google.com/o/oauth2/v2/auth?' + params);
      const code = await codePromise;
      const token = await jsonFetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, code_verifier: verifier, redirect_uri: redirect, grant_type: 'authorization_code' }) });
      await this.write({ clientId, clientSecret, ...token, expiresAt: Date.now() + token.expires_in * 1000 });
    } finally { clearTimeout(timer); server?.close(); this.connecting = false; }
  }
  async token() {
    const saved = await this.read();
    if (!saved?.access_token) throw new Error('Connect Gmail and Google Calendar in settings first.');
    if (saved.expiresAt > Date.now() + 60000) return saved.access_token;
    if (!this.refreshing) this.refreshing = (async () => {
      const token = await jsonFetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: saved.clientId, client_secret: saved.clientSecret, refresh_token: saved.refresh_token || '', grant_type: 'refresh_token' }) });
      await this.write({ ...saved, ...token, expiresAt: Date.now() + token.expires_in * 1000 });
      return token.access_token;
    })().finally(() => { this.refreshing = null; });
    return this.refreshing;
  }
  async api(url, options = {}) {
    return jsonFetch(url, { ...options, headers: { Authorization: 'Bearer ' + await this.token(), 'Content-Type': 'application/json', ...options.headers } });
  }
  async inbox() {
    const data = await this.api('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=in%3Ainbox%20is%3Aunread');
    return Promise.all((data.messages || []).map(async m => {
      const d = await this.api(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`);
      const header = name => d.payload?.headers?.find(h => h.name.toLowerCase() === name)?.value || '';
      return { id: d.id, from: header('from'), subject: header('subject'), date: header('date') };
    }));
  }
  async calendar() {
    const params = new URLSearchParams({ timeMin: new Date().toISOString(), timeMax: new Date(Date.now() + 7 * 86400000).toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '30' });
    const data = await this.api('https://www.googleapis.com/calendar/v3/calendars/primary/events?' + params);
    return (data.items || []).map(e => ({ id: e.id, title: e.summary || '(Untitled)', start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date, link: e.htmlLink }));
  }
  async send(draft) {
    validateDraft(draft);
    const subject = '=?UTF-8?B?' + Buffer.from(draft.subject).toString('base64') + '?=';
    const encodedBody = Buffer.from(draft.body).toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
    const mime = `To: ${draft.to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${encodedBody}`;
    // No automatic retry: a lost response could still mean delivery succeeded.
    return this.api('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', body: JSON.stringify({ raw: Buffer.from(mime).toString('base64url') }) });
  }
}
function validateDraft(d) {
  if (!d || typeof d.to !== 'string' || d.to.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(d.to) || typeof d.subject !== 'string' || !d.subject.trim() || /[\r\n]/.test(d.subject) || d.subject.length > 180 || typeof d.body !== 'string' || !d.body.trim() || d.body.length > 30000) throw new Error('Provide one valid recipient email, a subject (up to 180 characters) and a message.');
}
module.exports = { Google, validateDraft };
