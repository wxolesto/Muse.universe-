# MUSE — Phase 00 Project Audit

Audit date: 2026-11-17  
Repository: `wxolesto/Muse.universe-`  
Audited revision: `ca0a733cab3be6412cd2e7370783b2936057e1a0`

## Executive summary

MUSE has a working Vite + Phaser application foundation with separate modules for the world, journal storage, archive, Inner World, music files, ambience, pixel studio, and backups. The latest GitHub Actions production build is successful.

The current CI workflow verifies that the production bundle can be built. It does **not** yet run unit tests, browser interaction tests, linting, or accessibility checks. A successful build must not be interpreted as proof that every feature works correctly on every device.

## Confirmed strengths

- Application sections and their static DOM selectors are present; the audited selectors in `main.js` and `inner-world.js` all resolve to existing HTML IDs.
- The code is split into feature modules rather than one monolithic script.
- Journal entries and uploaded music files use IndexedDB, with a localStorage fallback for journal entries.
- Music files are stored separately from track metadata.
- Backup export includes journal, archive, artwork, discoveries, placed world objects, mood check-ins, playlists, track metadata, and audio blobs.
- World input listeners are removed when the Phaser scene shuts down.
- External listening links are restricted to HTTP and HTTPS.
- The repository includes an art-direction document that clearly distinguishes the current procedural island prototype from the intended final handcrafted art quality.

## Findings and risks

### High priority — backup restore consistency and validation

- Backup validation currently checks only a few top-level shapes. Nested records and image/audio payloads are not comprehensively validated.
- Journal restore writes entries into the existing database rather than replacing it, while several localStorage collections are overwritten. Music audio blobs are added without removing old blobs. Restore therefore has mixed merge/replace behavior.
- A malformed or unusually large backup can cause partial restoration or excessive memory/storage use.
- Recommendation: define explicit restore semantics, validate every collection and media payload, and make restore failure-safe before expanding the backup format.

### High priority — imported content reaches HTML templates

- Journal IDs were interpolated into HTML attributes without escaping. A crafted backup could supply an ID containing markup.
- Pixel Studio previously interpolated stored image data directly into an image `src` attribute. Imported backup content could therefore inject markup through that field.
- This audit begins hardening both rendering paths: journal IDs are escaped, and Pixel Studio accepts only bounded PNG data URLs for gallery images, rendering a placeholder for invalid images.

### Medium priority — no automated feature tests

- `package.json` currently defines `dev`, `build`, and `preview`, but no `test` or lint script.
- The repository has no committed `package-lock.json`, so `npm install` does not guarantee an identical dependency tree on every build.
- CI initially reported four high-severity findings: `fdir`, `picomatch`, `tinyglobby`, and the Vite dependency chain. The advisory path includes picomatch versions up to 4.0.7; the newly updated advisory for CVE-2026-112366 has no upstream fixed version stated as of this audit. These are build-tool dependencies, not application features. Do not apply the audit's suggested Vite downgrade blindly; review the complete dependency paths and retest before changing versions.
- The CI workflow now prints dependency-audit details on every run without blocking the production build.
- Recommendation: add tests for storage, backup validation, and critical pure functions; then browser-level smoke tests for core flows. Add a lockfile and switch CI to `npm ci` once the lockfile is generated and verified.

### Medium priority — editing and recovery gaps

- Journal and Archive support creation/deletion but do not yet provide editing.
- Pixel Studio resets the working canvas when its dimensions change; there is no explicit unsaved-work warning.
- World Builder supports placement of a small set of objects, but not selection, moving, resizing, rotating, or deletion of placed objects.
- Music Room has playback and playlists, but no metadata editor or full queue manager.

### Medium priority — privacy and offline behavior

- The HTML loads DM Mono, Manrope, and Playfair Display from Google Fonts. This creates an external network dependency and makes a request to Google when the page loads.
- Data is stored locally and is not encrypted. Backups are unencrypted JSON files.
- Recommendation: consider bundling fonts locally, and design encryption before adding any cloud synchronization.

### Medium priority — accessibility and device validation

- Focus-visible styling exists, but there is no reduced-motion preference handling in the stylesheet.
- Responsive CSS breakpoints exist, but there are no automated mobile layout or touch interaction tests.
- The latest successful build emits a minified JavaScript bundle of about 1.54 MB (about 361 kB gzip), above Vite's 500 kB chunk warning threshold. Phaser is statically imported by the main entry path, so code splitting should be evaluated.
- Recommendation: add reduced-motion support, keyboard-flow checks, and mobile browser smoke tests.

## Phase 00 action order

1. Harden imported-data rendering and backup validation.
2. Define safe, predictable restore semantics and add regression tests.
3. Add a repeatable automated test command and extend CI beyond build-only checks.
4. Review storage quotas, IndexedDB failure paths, and object URL cleanup.
5. Review keyboard accessibility, reduced motion, and mobile interaction behavior.
6. Only after these checks, begin feature expansion.

## Scope note

This is a static source and repository audit. It does not replace hands-on testing in a real browser on desktop and mobile devices. Items marked as risks should be verified with regression tests before being considered resolved.
