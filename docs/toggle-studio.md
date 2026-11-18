# Toggle Studio · v1.2

PixelFriend's display name is now **Toggle**. The source directory and bundle identifier retain their previous names for continuity. Startup opens a blue animated wordmark followed by a desktop customization studio. Reopen it from the tray or the companion's right-click menu. Reduced-motion preferences shorten the intro and disable its animation.

![Toggle Studio](images/toggle-studio.png)

The white grid viewport has vector guides for orientation and a timeline generated from the selected GLB animation's keyframes. Drag the playhead in either direction to inspect a pose, then press Play to continue from that point. With macOS Reduce Motion enabled, the 3D clip starts paused. The original animated avatar and static GLBs do not have a seekable timeline.

The input-to-time interaction follows [Oil Motion](https://github.com/oil-oil/oil-motion). The viewport renders the model and its existing clips live with Three.js.

## What's available

- Overview and Character Studio: real interactive 3D preview, Orbit starter, original animated avatar, custom GLB import, clip playback, orbit/zoom, facing rotation, desktop size and movement speed.
- Customization: user name, reminder bubble accent, movement, celebration laps, sounds, progress meter and speech-bubble style. Apply to desktop persists settings and the selected model. Custom mood images/videos and text remain available through the advanced appearance button for the original avatar.
- Reminders: water goal/interval, eye breaks, stretches, posture, custom text/interval, quiet hours, snooze and native notifications.
- Connections: Google OAuth setup/sign-in, Google polling preferences, city lookup and heat alerts. Google credentials are not bundled; public one-button sign-in still needs a developer-configured, verified OAuth client. The current personal-testing flow exposes the client configuration in a collapsed setup panel.
- Files & notes: direct local notes, Downloads preview/approval, manually composed editable email drafts with explicit send approval, upcoming primary-calendar events and unread Gmail headers. These operations do not call Ollama.
- **Local AI is on hold.** Studio does not start a model, call Ollama, or ask users to install one. The prior backend remains in source for a future deliberate reactivation. This release does not add voice or arbitrary desktop control.

## Run / update

After merging this PR, from your existing checkout:

```sh
cd ~/doggle
git switch main
git pull --ff-only
cd pixelfriend-v5
npm install --include=dev
npm start
```

Preserve local changes before switching branches. `npm start` automatically bundles the local Three.js renderer with esbuild. No runtime CDN is used for 3D. A lockfile now pins the dependency tree. If your npm installation blocks lifecycle scripts, the existing Electron installation still needs to be complete; the previously repaired Electron binary can be reused.

To make a Mac installer:

```sh
npm run dist -- --mac dmg
open dist
```

The installer/app display name is Toggle; quit the old PixelFriend app before running the new version. Installing the new app does not automatically remove the old app. The original app ID is retained, and the main process reuses an existing `PixelFriend` or `pixelfriend` userData directory before changing the display name. Backward continuity is implemented but has not been tested against an installed Mac build in this environment.

## Use a real 3D character

Orbit is an original procedural blue-and-white robot built from local Three.js geometry. It has Idle, Walk and Happy animation clips. Select it and click **Apply to desktop**. The guide's **Download .glb** button exports a real animated model (approximately 244 KB), rather than an image or video. It can be reimported into Toggle or edited in a compatible 3D application.

For a custom character:

1. Create a mesh in Blender, or use a 3D generation service such as Meshy or Tripo. Those services require their own accounts/terms; no paid generation service is connected to Toggle. A normal PNG/WebP image is not a 3D model.
2. Optional prompt: “A friendly small blue-and-white desktop robot, rounded shapes, two arms and two feet, front facing, clean low-poly topology, separate limbs, neutral pose.”
3. Rig and animate the mesh if you want limb animation. Name clips Idle, Walk, Happy, Ask, Sleep and Held. Clip names are matched case-insensitively. Run falls back to Walk; missing moods use the first available clip. A mesh without animations still renders and moves as a whole companion, but Toggle does not generate a skeleton or animation for it.
4. In Blender choose **File → Export → glTF 2.0 → glTF Binary (.glb)**. Include embedded textures, materials and animations. Disable Draco, Meshopt and KTX2/Basis compression. Apply transforms; model upright and facing +Z with feet near the origin. The viewer normalizes model bounds to fit; use facing rotation to correct orientation.
5. Prefer fewer than 50,000 triangles and texture dimensions up to 2K. Uploads are limited to 30 MB, embedded buffers/textures, at most 2,000 nodes/64 images and bounded accessor counts. FBX, OBJ, ZIP and external texture references must be converted before import.
6. In Studio choose **Upload**, inspect the model and animation selector, adjust facing/size, then **Apply to desktop**. Uploading alone never changes the active companion. The app stores its own local GLB copy under `character-studio` in userData.

No automatic rigging, text-to-3D inference, facial tracking or animation retargeting is provided. Unsupported/corrupt models show an error; a desktop rendering failure falls back to the original avatar. Orbit's colours are built into the model; the accent control changes the reminder bubble, not arbitrary mesh materials.

## Validation and limitations

- 18 Node tests pass: prior approval/file/email tests plus GLB structural/resource limits and editable-settings validation.
- Renderer build and JavaScript syntax checks pass.
- Headless Chromium with real WebGL/SwiftShader: animated intro, starter rendering, GLB export and reimport with all three clips, settings application, reminder update, AI-hold UI, manual Tamil note submission and a 780-pixel-wide layout passed. Native IPC was stubbed for this UI check.
- A GLB with an embedded PNG texture loaded successfully under the production content-security policy; external model URLs remain blocked.
- Browser motion checks passed for forward and backward seeking, visible pose changes, pause/resume, reduced-motion defaults and hiding the timeline for the original avatar.
- Companion renderer check: actual starter rendering in the desktop canvas, settings persistence in localStorage and switching back to the original avatar passed, with Electron bridge methods stubbed.
- The generated GLB was independently checked by the backend validator: 14 meshes, Idle/Walk/Happy clips, 243,908 bytes.

A native Mac installer, Finder file dialogs, OS-window click-through, Keychain migration, live Google sign-in and notification delivery still need acceptance testing on the user's Mac. No email was sent during development. Existing Electron/runtime dependency versions were not broadly upgraded in this UI-focused change.
