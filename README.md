# MUSE — The World of You

A private, expandable digital universe. A living pixel-art world connected to a modern personal archive.

## Current build

This first foundation includes:
- A responsive editorial interface with World, Journal, Archive and Studio areas.
- A Phaser-powered explorable island prototype.
- Keyboard and touch movement.
- A local-first journal using IndexedDB with a localStorage fallback.
- A real-world clock display and a responsive mobile layout.

## Run locally

Serve this folder with any static web server. For example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

Phaser is currently loaded from jsDelivr. A production build should vendor or bundle dependencies so the experience does not depend on a third-party CDN.

## Privacy and data

Journal entries are stored in this browser on this device. This prototype does **not** yet encrypt entries or provide backup/restore. Do not treat it as a secure vault until encryption, recovery and export have been implemented. Clearing browser site data can erase local entries.

## Roadmap

1. World engine and first island — current foundation.
2. Detailed original pixel-art environments, collision, interaction and animation.
3. Avatar creator and ambient companions Mina & Toto.
4. Seasons, weather, day/night lighting and soundscape.
5. Expandable islands and a world builder.
6. Journal, memory archive, people, music and knowledge collections.
7. Pixel-art studio, export, encrypted backups and restore.
8. Performance, accessibility, mobile packaging and full regression testing.

MUSE is designed as two connected experiences: **World Mode** for exploration and **Library Mode** for creating, writing and organizing. Both share the same local data layer.
