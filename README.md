# Toggle

A personal desktop companion with a blue animated welcome, a customization studio and real 3D characters. Built with Electron, JavaScript, HTML/CSS and Three.js.

![Toggle Studio](docs/images/toggle-studio.png)

```sh
cd pixelfriend-v5
npm install --include=dev
npm start
```

Open **Toggle Studio** from the tray or the companion's right-click menu. Customize the built-in Orbit robot, import a self-contained `.glb`, configure reminders, and use local notes / approved file and email actions. Ollama is on hold; these studio controls do not need local AI.

- [Studio setup, 3D workflow and validation](docs/toggle-studio.md)
- [Google OAuth configuration and v1.1 agent reference](docs/personal-agent.md)
- [Initial source review](docs/pixelfriend-v5-analysis.md)
- [Historical original-import checksums](docs/pixelfriend-v5-sha256.json)

The source folder remains `pixelfriend-v5/` for compatibility. It is an Electron application, not Python. The original imported source and assets are available in repository history; the checksum manifest describes that initial import, not subsequent changes.
