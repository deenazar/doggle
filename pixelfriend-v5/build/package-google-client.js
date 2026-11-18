'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { readDesktopClient } = require('../studio/google-client');

module.exports = async function packageGoogleClient({ appOutDir, electronPlatformName, packager }) {
  const source = process.env.TOGGLE_GOOGLE_CLIENT_FILE || path.join(__dirname, '../.local/google-client.json');
  const installed = await readDesktopClient(source);
  const mac = ['darwin', 'mas'].includes(electronPlatformName);
  const resources = mac
    ? path.join(appOutDir, packager.appInfo.productFilename + '.app', 'Contents', 'Resources')
    : path.join(appOutDir, 'resources');
  // Native clients are public. Only the two app registration fields belong in a release.
  await fs.writeFile(path.join(resources, 'google-client.json'), JSON.stringify({ installed }));
};
