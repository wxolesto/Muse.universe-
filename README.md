# MUSE — A Space of Your Own

MUSE is a private, local-first creative space for writing, collecting memories, keeping music, reflecting and making pixel art. Its visual identity stays atmospheric and editorial: a dark interface, quiet colours, thoughtful typography and a compact navigation rail.

## Current spaces

- **Home** — a calm overview and shortcuts to every part of MUSE.
- **Journal** — private pages and everyday thoughts, stored on the device.
- **Archive** — collections for Soundtrack, People, Curiosities and Memories.
- **Inner World** — optional mood check-ins, a calendar and a personal history.
- **Music Room** — saved tracks, album art, audio files, playlists and personal notes.
- **Pixel Studio** — a pixel-art workspace with 16×16, 32×32 and 64×64 canvases, pencil, eraser, fill, eyedropper, palette, undo/redo, PNG export and a local gallery.
- **Settings** — JSON backup and restore.

The former explorable island/game mode has been removed from the app experience. Existing backup compatibility is retained for older MUSE backup files, including legacy world fields, so restoring an older backup does not fail simply because it contains those fields.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

Create a production build:

```bash
npm test
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
5. Open that workflow run, scroll to **Artifacts**, and download the MUSE APK artifact.
6. Extract the ZIP and install the APK on your Android phone.

The workflow runs automated tests, builds the web app, generates the Android project and creates an APK. If stable release-signing secrets are configured, it creates a signed release APK; otherwise it creates a debug APK for testing. Artifacts are retained by GitHub for 14 days. See [Android release signing](./docs/ANDROID_SIGNING.md) to configure a stable signing key for in-place updates.

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

**Signing note:** keep the release keystore and its passwords private and backed up. Never commit them to this repository. Until release signing is configured and the first release-signed APK is installed, debug builds may require uninstalling an older build before installation. Back up MUSE data before reinstalling.

## Privacy and data

MUSE stores journal entries, archive records, mood check-ins, music metadata, audio files and pixel-art gallery data locally on the device. No app account or server sync is implemented.

Important limitations:
- Local browser storage is not encrypted.
- Clearing site data or changing browser/device can remove or strand local content.
- JSON backups are not encrypted.
- Do not use the current prototype as a secure vault for highly sensitive information.

## Product direction

MUSE is a personal workspace, not a game. Future development should deepen its writing, archive, music, reflection and creative tools while preserving the existing visual language, mobile usability, local-first storage and reliable backup/restore.
