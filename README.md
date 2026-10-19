# NATO Drill

A single-purpose iPhone web app (PWA) for drilling the NATO phonetic alphabet with swipeable, trading-card-style flashcards. Static files only: no build step, no frameworks, no network calls at runtime. It works fully offline after the first load.

## Gestures

| Gesture | Action |
|---|---|
| Tap | Flip the card |
| Swipe up | Got it (correct): the card gives a quick nod, then flies up and fades out |
| Swipe down | Missed: the card shakes its head, then drops away and fades out |
| Swipe right | Skip: carousel slide |
| Swipe left | Back to the previous card: carousel slide |

The nod (a 1.06× scale pop, 140ms) and head-shake (18 → 12 → 6px, 200ms) are a deliberate change from the original spec, which called for fly-off only. Each is followed by a 240ms fly-off with fade; the next card rises as the exit starts. With *Reduce Motion* turned on, both are replaced by a 150ms cross-fade.

Tap the **MASTERED** bar (top right) to open the Mission Log: per-letter mastery, export/import of progress, offline status and reset.

Keyboard (desktop): Space flips, ↑ correct, ↓ missed, → skip, ← back.

## Run locally

Service workers need `http://localhost` (not `file://`):

```bash
python -m http.server 8137
```

Then open http://localhost:8137.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`, and save.
3. After a minute the app is live at `https://<user>.github.io/<repo>/`. All paths are relative, so it works under the repo subpath.
4. On iPhone, open that URL in Safari, tap **Share → Add to Home Screen**.

### Shipping an update

Bump the cache name in [`sw.js`](sw.js) (`nato-drill-v1` → `nato-drill-v2`) on **every** deploy, and add any new files to its `ASSETS` list. Installed copies pick up the new version in the background and show `UPDATE AVAILABLE · TAP TO RELOAD` in the Mission Log; they never reload mid-drill.

## Offline acceptance test

Load the app once online, open the Mission Log and wait for `READY OFFLINE ✓`. Enable airplane mode, kill the app, relaunch it from the home screen: it should open with the right fonts, every gesture should work, and progress should save.

## Data & privacy

Progress lives only on the device in `localStorage` (`natoDrill.v1`). Use **EXPORT PROGRESS** in the Mission Log to save a `nato-drill-progress.json` backup (iOS may clear website data for apps that go unused for a long time) and **IMPORT PROGRESS** to restore it.

## Files

```
index.html             markup + iOS meta tags
styles.css             design tokens, card, sheet
app.js                 data, spaced repetition, gestures, stats, SW registration
sw.js                  offline cache (cache-first, versioned)
manifest.webmanifest   PWA manifest
fonts/                 Black Ops One, IBM Plex Mono 400/600 (SIL OFL, licenses included)
icons/                 180 / 192 / 512 PNG icons
```
