'use strict';

const fs = require('node:fs/promises');

async function readDesktopClient(file) {
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  const id = data?.installed?.client_id;
  const secret = data?.installed?.client_secret;
  if (typeof id !== 'string' || id.length > 300 || !/^[a-zA-Z0-9.-]+\.apps\.googleusercontent\.com$/.test(id) ||
      typeof secret !== 'string' || !secret.trim() || secret.length > 300) {
    throw new Error('Expected a Google Desktop OAuth client.');
  }
  return { client_id: id, client_secret: secret };
}

module.exports = { readDesktopClient };
