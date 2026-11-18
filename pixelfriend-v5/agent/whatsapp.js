'use strict';
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);

// JXA runs locally. Query only titles for the WhatsApp Web origin and return one count.
const readBadge = `function run() {
  const chrome = Application('com.google.Chrome');
  if (!chrome.running()) return '';
  let count = -1;
  for (const win of chrome.windows()) {
    const titles = win.tabs.whose({url: {_beginsWith: 'https://web.whatsapp.com/'}}).title();
    for (const title of titles) {
      const match = /^\\((\\d+)\\+?\\)/.exec(title);
      count = Math.max(count, match ? Number(match[1]) : 0);
    }
  }
  return count < 0 ? '' : String(count);
}`;

async function unreadCount() {
  const { stdout } = await run('/usr/bin/osascript', ['-l', 'JavaScript', '-e', readBadge], { timeout: 12000 });
  const value = stdout.trim();
  return /^\d+$/.test(value) ? Number(value) : null;
}
module.exports = { unreadCount };
