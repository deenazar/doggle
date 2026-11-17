# Toggle · v1.2

Your desktop companion, made personal. Startup opens Toggle Studio with an animated blue logo, character customization, reminders, connections, files and notes.

```sh
npm install --include=dev
npm start
```

- `npm start` builds the local Three.js renderer and starts Electron.
- `npm test` runs backend and GLB/settings validation tests.
- `npm run dist -- --mac dmg` builds a Mac installer on macOS.

Select the built-in Orbit robot or upload a self-contained animated GLB. The in-app **3D character guide** covers creation, rigging, animation and export, and can export Orbit as an editable GLB. The original animated avatar is still available.

Ollama is on hold. Notes, file organization previews, editable email drafts and Google/Weather integrations have direct controls. Google features require your own Desktop OAuth client and browser consent; credentials are not bundled.

See [the full studio guide](../docs/toggle-studio.md) for setup, compatibility and validation limits.
