# Toggle · v1.2

Your desktop companion, made personal. Startup opens Toggle Studio with an animated blue logo, character customization, reminders, connections, files and notes.

```sh
npm install --include=dev
npm start
```

- `npm start` starts Electron.
- `npm test` runs backend and settings validation tests.
- `npm run dist -- --mac dmg` builds a Mac installer on macOS.

The original animated avatar is the default. Preview its moods in Studio and use the Character guide to open the custom image and video editor.

Ollama is on hold. Notes, file organization previews, editable email drafts and Google/Weather integrations have direct controls. Google features require your own Desktop OAuth client and browser consent; credentials are not bundled.

See [the full studio guide](../docs/toggle-studio.md) for setup, compatibility and validation limits.

In Studio → Reminders, set the minutes on desktop and away, launch music, and an optional daily alarm in local time. The default visit lasts 10 minutes followed by 50 minutes away. Connected alerts briefly bring the companion back during a break. Quiet hours silence the launch music, alarm and character alerts.

On macOS, Studio → Connections can also check the unread badge on a signed-in WhatsApp Web tab in Google Chrome. Enable the switch, save, and allow Chrome automation when prompted. Toggle checks once per minute. It announces increases in the badge count and does not retrieve message bodies. Closing the tab clears its baseline. The standalone WhatsApp and Clock apps and other Notification Center banners are outside this integration.
