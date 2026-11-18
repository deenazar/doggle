'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { readDesktopClient } = require('../studio/google-client');

async function setup() {
  let source = process.argv[2];
  if (!source && process.platform === 'darwin') {
    const { stdout } = await promisify(execFile)('/usr/bin/osascript', ['-e',
      'POSIX path of (choose file with prompt "Select your Google Desktop OAuth client JSON")']);
    source = stdout.trim();
  }
  if (!source) throw new Error('Pass the path to your Google Desktop OAuth client JSON.');
  const installed = await readDesktopClient(source);
  const directory = path.join(__dirname, '../.local');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const temp = await fs.mkdtemp(path.join(directory, 'setup-'));
  try {
    const file = path.join(temp, 'google-client.json');
    await fs.writeFile(file, JSON.stringify({ installed }), { mode: 0o600 });
    await fs.rename(file, path.join(directory, 'google-client.json'));
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
  console.log('Desktop client saved. Run npm start and choose Sign in with Google.');
}
setup().catch(() => { console.error('Setup did not finish. Select a readable Desktop OAuth JSON.'); process.exitCode = 1; });
