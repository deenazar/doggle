'use strict';

const fs = require('node:fs/promises');

async function readDesktopClient(file) {
  const info = await fs.stat(file);
  if (!info.isFile() || info.size > 32768) throw new Error('Select a Google Desktop OAuth client JSON file.');
  let data;
  try {
    data = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    throw new Error('Could not read the Google client JSON.');
  }
  const clientId = data?.installed?.client_id;
  const secret = data?.installed?.client_secret;
  if (typeof clientId !== 'string' || clientId.length > 300 ||
      !/^[a-zA-Z0-9.-]+\.apps\.googleusercontent\.com$/.test(clientId) ||
      typeof secret !== 'string' || !secret.trim() || secret.length > 300) {
    throw new Error('Choose a Desktop app OAuth JSON containing a client ID and secret.');
  }
  return { clientId, secret };
}

async function selectDesktopClient(localFile, chooseFile) {
  if (localFile) {
    try {
      return await readDesktopClient(localFile);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const file = await chooseFile();
  return file ? readDesktopClient(file) : null;
}

module.exports = { selectDesktopClient };
