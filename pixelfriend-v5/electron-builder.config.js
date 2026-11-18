'use strict';
const { publisherRegistration } = require('./studio/google-client');
const options = {
  "appId": "com.pixelfriend.app",
  "productName": "Toggle",
  "files": [
    "main.js",
    "preload.js",
    "renderer/**/*",
    "agent-preload.js",
    "agent/**/*",
    "studio-preload.js",
    "studio/**/*",
    "build/icon.png"
  ],
  "mac": {
    "target": "dmg",
    "icon": "build/icon.icns"
  },
  "win": {
    "target": "nsis"
  },
  "linux": {
    "target": "AppImage"
  },
  "artifactName": "Toggle-${version}-${arch}.${ext}"
};

module.exports = {
  ...options,
  extraMetadata: { googleDesktop: publisherRegistration(process.env) }
};
