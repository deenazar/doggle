# PixelFriend v5 technical review

Reviewed 2026-11-16. Input: `PixelFriend-v5.zip` (8,869,685 bytes). The application is imported unchanged under `pixelfriend-v5/`; `pixelfriend-v5-sha256.json` records every original file's SHA-256. Archive documentation is treated as project material, not as instructions authorizing actions.

## What this application actually is

This is an Electron desktop companion implemented in JavaScript, HTML and CSS, **not a Python application**. The archive contains 11 files: main process, preload bridge, a single HTML renderer, package metadata, README and six animated WebP assets. It contains no Python runtime, Python source, backend, AI model or autonomous computer-control agent.

The app interacts with its own transparent overlay: it observes mouse events, animates a character, supports dragging/throwing/petting, displays reminders and exposes a tray menu. It does not contain code for typing into other applications, clicking other apps, capturing the screen, reading arbitrary user files, or executing shell commands. Choosing a custom avatar is an explicit file-picker action.

## Architecture and data flow

| Component | Responsibilities |
| --- | --- |
| `main.js` | Primary-display work-area window, always-on-top behavior, mouse pass-through, tray commands, native notifications and login launch setting. |
| `preload.js` | `window.pf` bridge: ignoreMouse, focus, notify, and renderer subscriptions to tray events. |
| `renderer/index.html:249–773` | Settings, storage, mood selection, media processing, movement physics, reminders, mouse handling and statistics. CSS and markup share this same file. |
| `renderer/avatars/` | Six bundled moods: idle, walk, ask, happy, sleep and held. Other moods use fallback media plus CSS behavior. |
| `package.json` | Electron 33.2.1 and electron-builder 25.1.8; npm start and distribution scripts. DMG, NSIS and AppImage build targets. |

The main process loads the local HTML. Renderer initialization merges defaults with `pf3` localStorage (falling back to `pf2`), loads avatar overrides from IndexedDB, and starts an animation frame loop. Tray actions reach renderer handlers through prefixed `pf:` IPC. The bridge allows the renderer to toggle window mouse handling, request focus and show a notification.

Movement uses frame-time integration capped at 50 ms, gravity, bounce damping and bounded horizontal velocity. An idle scheduler runs every 700 ms. A reminder scheduler runs every five seconds, checking quiet hours, hidden/busy state and reminder timestamps. Priority is water, eyes, stretch, posture, then custom; no fair queue is implemented. Eye breaks use a 20-second countdown. Completion updates local counters; snooze shifts the previous reminder timestamp.

Settings and day-indexed history persist in localStorage; media blobs persist in IndexedDB `pixelfriend`, store `img`. No server sync, export, account system or encryption is implemented. Persistence errors are often swallowed, so visible success need not mean durable saving. The page requests Google Fonts CSS (and its font assets), so it is not entirely network-independent. No telemetry or application-data upload code was found in the supplied source.

## Findings, ordered by impact

### High: malformed persisted state can stop startup

`renderer/index.html:270–280` validates JSON syntax but does not validate the merged object. `{ "hist": null }` reaches `H()` and throws before normal initialization completes. Reproduced in Chromium: `Cannot read properties of null (reading '2026-11-16')`. Validate types, finite numbers and nested history records; recover incompatible state with a migration/default strategy. User editing of storage is one trigger; malformed migrations or interrupted upstream data changes are other possible triggers, not demonstrated here.

### High portability risk: Linux desktop click-through needs native verification

`main.js:24` starts with all mouse input ignored, relying on `{forward:true}` and renderer `mousemove` to re-enable interaction (`renderer/index.html:677–684`). Electron's forwarded mouse-move behavior is platform-specific (documented for macOS/Windows), while this package also advertises AppImage. On Linux the re-entry mechanism may not work. Browser tests cannot establish native click-through correctness; test each intended window manager and implement a supported hit-test/cursor strategy where needed.

### Medium: correcting today's count leaves history and streaks inconsistent

`renderer/index.html:755` sets history with `Math.max(H().w, S.glasses)`. Reproduced: log one glass, change today's count to zero, save. Persisted `glasses` becomes 0 but today's history remains 1. The headline, chart and streak can disagree. Define correction semantics and synchronize both representations when the user edits the counter.

### Medium: interrupting a non-water reminder can leave scheduling stuck

`drink()` (`:573–580`) clears `asking` only for a water reminder but replaces the bubble/actions for every invocation. The tray can call it during a stretch, posture or custom prompt. After replacement there may be no completion/snooze button while `asking` remains set, and the automatic scheduler (`:592–598`) returns early forever. Double-click has a guard, but the tray path does not. Reproduce with a native tray or injected tray event during one of those prompts; centralize reminder transitions and explicitly resume/cancel the interrupted prompt. This is a code-path finding, not an automated reproduction in this review.

### Medium: uploaded-image processing lacks error handling and lifecycle cleanup

`removeBg()` (`:298–329`) creates an object URL without revoking it and supplies no `onerror`. A corrupt image can leave the promise pending and the avatar upload unfinished. The async upload handler (`:736–739`) lacks a catch/user-visible error, file size limit and media dimension limits. The image cleanup path rasterizes a single frame, so importing an animated WebP with background removal enabled loses its animation. Add decoding errors, resource cleanup, bounds and explicit animation handling.

### Medium: desktop security hardening is incomplete

Context isolation is explicitly enabled, and the bridge does not expose arbitrary Node execution. However, the HTML has no Content Security Policy, the main process does not validate IPC sender frames or argument types, and the subscription API accepts arbitrary channel suffixes. There are no explicit navigation/new-window restrictions. Existing message text is generally inserted through `textContent`; the `innerHTML` usages for counts/charts consume unvalidated stored state. These are hardening opportunities, not proof of a remote exploit. Restrict IPC channels and payloads, validate stored state, use safe DOM construction, restrict navigation and introduce a suitable CSP after separating inline scripts/styles.

### Medium: dependency and release reproducibility gaps

Direct versions are pinned, but the archive has no lockfile, automated tests or CI, and no documented supported Node/npm version. Electron 33.2.1 is an old pinned runtime and should be checked against current supported Electron releases and advisories before distributing binaries. No vulnerability database audit was performed; this report does not claim a specific CVE or a clean dependency tree. Upgrade and regression-test separately from this faithful source import.

### Medium: primary-monitor-only and native lifecycle limitations

`getPrimaryDisplay()` is used for both initial placement and display changes. The character cannot roam across all monitors. An always-on-top full-work-area transparent window, disabled background throttling and an unconditional animation loop can consume resources even when hidden. The video path reads/transforms pixels at approximately 30 fps. No native CPU/GPU profiling was performed. There is no explicit single-instance lock or robust window recreation flow; startup integration and packaging need per-platform verification.

### Low: statistics and validation edge cases

Skipping the eye-break countdown takes its completion branch and increments eye-break history (`:583–586`), which may misrepresent completed breaks. Several settings rely on HTML input constraints rather than comprehensive validation; extreme values can stress rendering. Saving or performing some health actions around midnight can use a stale daily state until the five-second roll-over check. Define these semantics and add boundary coverage.

### Low: metadata and distribution documentation drift

The uploaded filename says v5, its README says v3, and package metadata says 1.0.0. The README references missing chat instructions for Electron installation. No license, signing configuration or release workflow is supplied. Preserve the original metadata for traceability in this import, then establish a canonical version, self-contained setup instructions and distribution policy.

## Verification performed

- Safely inspected archive member paths and symlink modes before extraction; no traversal/symlink entries found.
- Reviewed all JavaScript and renderer logic and inventory of shipped assets. No credential files or embedded credential values were identified in this small supplied source set; this is not a comprehensive third-party dependency secret audit.
- Node syntax checks passed for `main.js`, `preload.js` and the extracted inline renderer script.
- Headless Chromium renderer smoke check passed: all six bundled assets loaded; settings saved; a reminder completion logged water; stats displayed `1/8`; name persisted across reload. Native Electron APIs were stubbed. The reminder button was triggered using a DOM event because continuous animation defeated Playwright's stable-element click check, so this does not validate real pointer clickability.
- Counter/history inconsistency and malformed-storage startup failure were reproduced as described above.
- All original imported files are byte-for-byte identical to their archive counterparts, verified using SHA-256.

Not performed: native Electron launch, OS tray/notification/login tests, actual desktop mouse pass-through tests, multi-monitor tests, installer builds, code signing, dependency installation/audit, or performance profiling. The renderer smoke check is not an end-to-end desktop acceptance test.

## Recommended next implementation sequence

1. Validate/migrate persisted state and fix counter/history and reminder-state transitions, with regression cases for each.
2. Verify native click-through and tray behavior on intended operating systems, then resolve monitor/lifecycle gaps.
3. Handle media upload errors and limits, harden IPC/navigation/CSP, and bundle the font if fully offline operation is desired.
4. Update supported runtime dependencies, commit a lockfile, add targeted tests and CI, and verify installers before release.

The current PR is a source import and review only. These recommendations are deliberately not mixed into the original application files.
