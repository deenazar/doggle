# PixelFriend 💧 (v3)

Your own 3D avatar lives on your desktop, roams around, plays with you and reminds you to drink water.

## What it does
- Walks around the bottom of your screen, looks at your mouse, sleeps at night
- Drag him up and throw him: he falls with gravity, bounces, says "Aiyo!"
- Wiggle the mouse over him to pet him (he giggles)
- Click: he talks; double-click: logs a glass; right-click: quick menu
- Water reminder: he runs to your mouse and asks "Hey, {name} Did you drink water?" with YES / Remind me later
- After YES: +1 💧, happy jump and a victory lap across the screen; confetti when the daily goal is complete
- Health reminders: eye break 20-20-20 (with 20 s countdown), stretch, posture, your own custom reminder
- Stats: today, streak, stretches, eye breaks, last 7 days chart
- Customize everything: 6 avatar images (normal, walking, asking, happy, sleeping, held), name, size, speed, intervals, quiet hours, messages, bubble style, sounds

## Run
```bash
npm install
npm start
```
macOS + npm 11 blocks Electron's download script; if `npm start` says "Electron failed to install", see the chat steps (download Electron manually into node_modules/electron/dist).
Run from the normal Terminal app, not from an Electron-based IDE terminal (they set ELECTRON_RUN_AS_NODE).
