# Toggle Studio

Toggle opens with a short blue logo animation and a character studio on a white grid. The preview starts with the original animated character. Select a mood to see its built-in animation. The sidebar also opens Reminders, Connections, and Files & Notes.

![Toggle Studio](images/toggle-studio.png)

Change the character's name, size, speed, bubble accent and wandering behavior, then choose **Apply to desktop**. Expand **Fine-tune your companion** for sound, celebration laps and bubble style. The **Character guide** opens the existing desktop editor where you can replace individual mood images or videos. Removing an upload restores that slot's built-in animation.

The desktop uses the original image and video avatar system. If an earlier preview build used a 3D model, Toggle resumes using the image avatar. Existing image and video overrides are kept.

## Run on your Mac

After merging the PR, update your checkout:

```sh
cd ~/doggle
git switch main
git pull --ff-only
cd pixelfriend-v5
npm install --include=dev
npm start
```

To package a Mac installer on macOS:

```sh
npm run dist -- --mac dmg
open dist
```

Quit the previous app before opening Toggle. The bundle ID is retained, and Toggle reuses the previous user data folder when it exists.

## Connections and tools

Google and weather settings are under **Connections**. Set up Google with a Desktop OAuth client and browser consent. See the [Google setup instructions](personal-agent.md). Local AI remains on hold. Notes, Downloads previews and manually composed email drafts work through the direct controls in **Files & Notes**. Moves and sends require approval.

## Verification

The Node test suite and Chromium smoke checks cover the original avatar preview, mood switching, desktop settings, editor entry, reminders, notes, and narrow layout. Native Mac packaging and file selection still need testing on macOS.
