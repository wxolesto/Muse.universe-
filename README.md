# MUSE — The World of You

A private, expandable digital universe: a richly atmospheric pixel-art world connected to a modern personal archive and creative workspace.

## Current foundation

### World Mode
- Phaser 3 world engine with a large first-island prototype, camera follow and movement.
- Keyboard controls (WASD / arrow keys), sprint and mobile touch controls.
- Layered shoreline with a masked, hand-seeded pixel terrain texture, beach bands, animated water glints, grass, ferns, boulders, driftwood, tide pools, an ancient marker, a wayfarer hut and pier.
- Mina and Toto appear as original pixel-art myna sprites with animated wings and independent flight paths.
- Four discoverable landmarks with local progress tracking and map markers.
- Procedural ocean-and-wind ambience with a master toggle and volume control (starts only after user interaction).
- Real-device-clock day/night lighting.
- A live archipelago map with a player-location marker and unexplored island silhouettes.
- Seasonal weather pass with rain, snow, fog and autumn leaves. Weather is currently a deterministic game-world simulation, not a live weather forecast.

### Library Mode
- Private local journal with IndexedDB storage and localStorage fallback.
- Archive collections for Soundtrack, People, Curiosities and Memories.
- Interactive Pixel Studio: 16×16, 32×32 and 64×64 canvases, pencil, eraser, fill, eyedropper, palette, undo/redo, PNG export and local gallery.
- Local JSON backup and restore for journal entries, archive collections and pixel artwork.
- Responsive editorial interface designed to complement the pixel-art world.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

Create a production build:

```bash
npm run build
npm run preview
```

## Build an Android APK

MUSE uses Capacitor to package the Vite app as an installable Android application.

### Build from GitHub

1. Open the repository's **Actions** tab.
2. Select **Build MUSE Android APK**.
3. Press **Run workflow** and confirm the `main` branch.
4. Wait for the workflow to finish successfully.
5. Open that workflow run, scroll to **Artifacts**, and download `MUSE-Android-APK`.
6. Extract the ZIP and install `app-debug.apk` on your Android phone.

The workflow runs the automated tests, builds the web app, generates the Android project and creates a debug APK. The artifact is retained by GitHub for 14 days.

### Build locally

Requirements: Node.js 22+, Android Studio, and Android SDK.

```bash
npm install
npm run build
npx cap add android
npx cap sync android
```

Open the generated `android/` folder in Android Studio, or build a debug APK from the command line:

```bash
cd android
./gradlew assembleDebug
```

The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.

**Signing note:** the GitHub workflow currently produces a debug-signed APK for personal testing. A stable private release-signing key is needed for seamless in-place updates across future APK builds; do not publish or commit that private key. Until release signing is configured, Android may require uninstalling an older build before installing a debug APK signed with a different key. Back up MUSE data before reinstalling.

## Privacy and data

MUSE currently stores journal entries, archive records and pixel-art gallery data in the browser on the device where they were created. No app account or server sync is implemented.

Important limitations:
- Local browser storage is not encrypted in this prototype.
- Clearing site data or changing browser/device can remove or strand local content.
- JSON backup and restore are now available from Settings, but backups are not encrypted.
- Do not use the current prototype as a secure vault for highly sensitive information.

## Quality direction

MUSE aims for handcrafted pixel-art environments with strong silhouettes, layered depth, original sprite work, environmental animation and detailed sound design. The current island is a functional art-direction prototype; it is not yet the final high-detail production art pass.

See [docs/ART_DIRECTION.md](./docs/ART_DIRECTION.md).

## Roadmap

1. First Shore and core world engine — prototype.
2. Higher-resolution handcrafted tile sets, richer character sprite sheets, collision layers and environmental animation.
3. Avatar creator and deeper companion behaviour for Mina and Toto.
4. Robust season, weather, time and ambient sound systems.
5. Expandable island/region editor and world interactions.
6. Rich journal, memory timeline, people and culture libraries.
7. Pixel Studio layers, selection tools, palettes and project files.
8. Encrypted backups, import/export, restore and data migration.
9. Performance profiling, accessibility, mobile packaging and regression testing.

MUSE is intentionally split into two connected experiences: **World Mode** for exploration and **Library Mode** for writing, creating and organizing. Both will share a common local-first data layer.
