# Personal agent reference (v1.1)

> In v1.2 the application is named Toggle, and Ollama/chat is on hold. Use [Toggle Studio](toggle-studio.md) for current setup and direct notes/files/email controls. The Google OAuth instructions below still apply; the Ollama/chat instructions describe the earlier version.

This adds a separate Tamil/English chat window to the desktop companion. Open it from the avatar’s right-click menu or the tray menu: **Personal Agent · தமிழ் chat…**. The existing avatar and health reminders remain available.

## Implemented capabilities

- Local Ollama tool-calling chat; no hosted LLM or AI API key. The default suggested model is `qwen3:4b`; choose any installed Ollama model with compatible tool calling. Tamil fluency, speed and instruction following depend on your model and Mac memory.
- Local Markdown notes, listing recent notes, and opening their folder in Finder.
- Downloads organization **preview → human approval → move**. Groups recognized files by extension into Images, Documents, Audio, Videos, Archives and Installers. Only top-level regular files older than one minute are eligible. It skips folders, symlinks, unknown types, changed files and existing destination names. No overwrite/delete tool is available to the model. Moves use same-filesystem hard links followed by unlinking the original name; failed moves are reported individually. Do not organize files that another application is actively writing.
- Local editable email draft cards. **Approve & send email** sends the displayed recipient, subject and body through Gmail. No tool is exposed for the model to approve or send. One recipient per draft; no attachments, CC/BCC, contact-name resolution or scheduled delivery. Drafts are kept in memory, not Gmail Drafts. They expire after 15 minutes and are lost on app restart.
- The 10 most recent unread Gmail inbox message headers and up to 30 primary-calendar events in the next seven days. Message bodies and attachments are not fetched.
- Optional polling every minute while the app runs: new unread mail notifications and timed calendar reminders within 10 minutes of start. The avatar also shows a short bubble when it is not busy or hidden. First poll establishes the old-mail baseline. All-day events and secondary calendars are excluded. Notifications are not guaranteed delivery: sleep, offline periods and more than 10 incoming unread messages between checks can cause misses.
- On-demand city weather and optional heat alerts. Search and select the exact city in Settings, enable alerts and choose a 20–50 °C threshold. The app checks Open-Meteo every 30 minutes, alerts at/above the threshold, and rearms after a cooler reading. A hot first check after restart may notify again. This is current weather, not severe-weather warnings. Weather attribution: [Open-Meteo](https://open-meteo.com/).

## Set up on your Mac

1. Install [Ollama for macOS](https://ollama.com/download/mac), launch it, and in Terminal run:

   ```sh
   ollama pull qwen3:4b
   ```

   Keep Ollama running. The model download requires Internet; subsequent model inference is local. Use a smaller/larger compatible tool-calling model if your hardware requires it. PixelFriend uses only `http://127.0.0.1:11434` for AI calls and does not allow a remote model endpoint.

2. Obtain this feature branch, or pull main after its PR is merged. From your existing checkout:

   ```sh
   cd ~/doggle
   git fetch origin
   git switch feature/local-personal-agent
   cd pixelfriend-v5
   npm install --include=dev
   npm start
   ```

   Preserve any local changes before switching branches. This feature adds no npm dependencies; your existing working Electron installation can be reused. If installation scripts are blocked, approve Electron's installer using your npm version's install-script controls. Do not delete a working Electron installation just to try this update.

3. Open **Personal Agent · தமிழ் chat…** from the tray, open Settings, click **Check Ollama**, select the installed model and save.
4. Try notes and Downloads preview before connecting Google. Examples:
   - `நாளைய meeting-க்கு note எழுது: budget மற்றும் timeline பற்றி பேச வேண்டும்.`
   - `என்னுடைய Downloads folder-ஐ ஒழுங்குபடுத்த preview காட்டு.`
   - `என்னுடைய notes காட்டு.`
5. To create a Mac installer on your Mac, run `npm run dist -- --mac dmg`. Quit the running old app before replacing it in Applications. Signing/notarization remains your existing build setup; this PR does not add an Apple distribution identity.

## Connect Gmail and Google Calendar

Choose **Sign in with Google** in the welcome screen or in **Connections**. Select your account and approve Gmail read, Gmail send and Calendar event read access in the browser. Toggle stores the account grant locally. Choose **Continue as guest** for local features. Enable mail and calendar notifications in Connections if desired.

### Release maintainer setup

Enable the Gmail API and Google Calendar API in the app's Google Cloud project. Configure its OAuth consent screen and create a **Desktop app** OAuth client. Save its downloaded JSON at `pixelfriend-v5/.local/google-client.json` on the build machine, or set `TOGGLE_GOOGLE_CLIENT_FILE` to its path. The same configuration works for development runs. The packager includes only the desktop client registration ID and secret in the application resources. Desktop OAuth registration is public client information recoverable from the distributed app. Account tokens are created on each user's device after consent.

While the OAuth project is in Testing, grant access to the intended test accounts. To distribute to the public, publish the consent configuration and complete Google's applicable verification for the requested scopes. Testing-mode refresh tokens may expire after seven days. The app uses a loopback callback with PKCE and state validation.

The signed-in account’s tokens are encrypted via Electron `safeStorage` (macOS Keychain-backed protection) in the app's user data directory. If secure storage is unavailable, connection fails closed. Local disconnect removes stored credentials and disables Google polling; it does not revoke the Google grant. Revoke that separately in your Google Account's third-party connections if desired. Stored metadata/history is not an encrypted vault.

## Approval and data boundaries

Email and calendar content are treated as untrusted data in the model prompt. Approval is enforced outside the model in the main process. The approval cards show the actual action payload; review recipients and contents before sending. Approval IDs are one-use and expire. If a send fails after request transmission, the app reports unconfirmed delivery and does not retry automatically: check Gmail Sent before preparing another draft.

Notes and downloaded filenames remain local. Requested Gmail/Calendar metadata is sent to your local Ollama model, not a cloud model. Weather queries send the selected city/coordinates to Open-Meteo. Gmail sends the approved message to Google. Google OAuth uses the system browser. The original companion still loads its external Google Font.

Notes live under `personal-agent/notes` in Electron's app userData directory; use **Open local notes** to locate them. Chat history and draft cards are memory-only. Google tokens are in `google.enc`; settings and notification deduplication metadata are stored locally. `activity.jsonl` records successful action results (message IDs or moved paths), not email bodies; filesystem logging failure does not make a successful send appear failed.

## Deliberate current limits

This is a bounded personal-agent foundation, **not full macOS control**. It does not perform arbitrary mouse clicks/keystrokes, launch arbitrary shell commands, scrape all Notification Center messages, read every application, or capture the screen. macOS has no general supported API for consuming every other app's notifications; service-specific integrations are used instead. It does not request Accessibility or Screen Recording permissions.

Tamil communication is text-based. Microphone input, offline speech recognition and spoken replies are not implemented. Local voice support and broader native desktop automation require a separate implementation and Mac-specific permission/acceptance testing. It also does not create Google Calendar events or synchronize notes with Apple Notes. File organization is extension-based, not content-based AI classification. The original app's reviewed issues are not all fixed by this feature.

## Validation

Run `npm test` from `pixelfriend-v5/`. Tests cover no-overwrite moves, file-change/symlink skips, local notes, approval replay/expiry/cancellation, email header injection and Tamil encoding, unavailable secure storage, notification deduplication, independent Google/weather polling and mocked Ollama tool rounds.

Renderer smoke testing uses Chromium with a stubbed preload bridge. Live Gmail/Calendar OAuth, a real local Ollama model, Apple Keychain, native notifications and Mac DMG installation must be verified on your Mac. No live email was sent during development.
