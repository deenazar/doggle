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
