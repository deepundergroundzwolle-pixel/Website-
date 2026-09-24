# NOTES — P0 upgrades (ROY EL KEI site)

Working copy: `/workspace/roy-el-kei-site/`  
Date: 2026-09-24 (Europe/Amsterdam)

## What changed

### 1. Mobile nav (`index.html`, `style.css`, `site.js`)
- Desktop **≥1024px**: horizontal nav unchanged; active link = lavender underline / color.
- Mobile/tablet **&lt;1024px**: logo left, **Menu** pill right; full-screen slide-over with stacked links (≥44px tap targets) and close **×**.
- Backdrop + `body.nav-open` scroll lock while open; Escape / link tap / backdrop close the menu.
- Orientation change / resize to desktop closes the menu.
- Top lavender **progress bar** stays visible (`z-index` above the dimmed backdrop).

### 2. Hash aliases (`site.js`, `index.html`)
- Stable section ids: `home`, `about`, `music`, `tour`, `bookings`, `services`, `merchandise` (Bookings was `contact` → now `bookings`).
- Alias: `#cloud` → `#music` (URL rewritten to `#music`).
- Legacy: `#contact` → `#bookings`.
- On load: scroll-to-hash once (instant). Unknown hash → scroll to top, hash cleared, no error.
- Nav active-state updates are briefly locked after programmatic scroll so Intersection/scroll logic does not fight the hash target.

### 3. Shared audio engine (`site.js`)
- One shared control path for **hero loop** + **music teaser** (HTMLAudioElement; mutual pause).
- Hero states: `locked | muted | playing`. Music: `idle | playing | paused | ended`.
- Autoplay (if allowed) is always **muted** until a user gesture.
- Tab / page hidden → pause both.
- `prefers-reduced-motion: reduce` → no pulsing hero bars / no card hover scale.
- Missing files → controls hidden (hero cluster / player strip); card stays visual.

### 4. Hero unmute + Music player + THE RETURN. card
- Hero: Mute/Unmute cluster (“Tap for sound” until first unmute); mini bars pulse only while playing (and not under reduced motion).
- Music: inline player strip (title · play/pause · seek · time · Open on Spotify).
- “THE RETURN.” card: desktop hover scale 1.02 + play affordance; click plays teaser in the inline player and shows pause state on the card.
- No teaser file → card click opens Spotify search (fallback).

## Audio assets (blocker until supplied)

Create / place (see `assets/audio/README.md`):

- `assets/audio/hero-loop.mp3`
- `assets/audio/the-return-teaser.mp3`

Optional: `.ogg` with the same basenames. **Do not invent fake binaries** — until files exist, UI degrades gracefully.

## Files touched

| File | Change |
| --- | --- |
| `index.html` | Mobile nav markup; hero audio cluster; interactive release card; music player; `id="bookings"` |
| `style.css` | P0 nav / hero audio / player / card styles |
| `site.js` | Mobile menu, hash aliases, audio engine + UI wiring (existing reveal/merch/progress kept) |
| `assets/audio/README.md` | Asset drop instructions |
| `NOTES-P0.md` | This file |

## How to test

Serve locally:

```bash
cd /workspace/roy-el-kei-site
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/`

1. **Mobile nav** — DevTools width 320–430px: no horizontal nav overflow; Menu opens overlay; all 6 sections reachable; body does not scroll behind menu; progress bar still visible while scrolling with menu closed.
2. **Desktop nav** — ≥1024px: horizontal links + lavender active underline still look as before.
3. **Hashes** — Visit `/#cloud` and `/#music` → Music section. `/#bookings` → Bookings. `/#nope` → top, no console error.
4. **Audio absent** — With no mp3s: hero unmute control and player strip hidden; THE RETURN. card still looks correct; click opens Spotify.
5. **Audio present** — Drop real mp3s into `assets/audio/`, hard-refresh: hero “Tap for sound” works; playing music pauses hero and vice versa; blur tab pauses; reduced-motion disables bars.

## Explicit non-goals (this P0)

- Tour next-up / notify, Services hover CTA, Merch featured, motion delight layer (P1+).
- No build step / no framework.
