# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev server

**Option A — Netlify CLI (recommandé, même comportement qu'en prod) :**
```
npx netlify dev
```
Démarre sur http://localhost:3000. Les Netlify Functions tournent localement et les données vont dans Netlify Blobs (nécessite `netlify link` et d'être connecté).

**Option B — Express local (rapide, données fichiers locaux) :**
```
npm start
```
Démarre sur http://localhost:3000 avec stockage dans `data/`. Le `data/config.json` est auto-créé au premier lancement (mdp par défaut : `1234`). Ne pas commiter les fichiers `data/*.json`.

- Site : http://localhost:3000
- Admin : http://localhost:3000/admin/index.html (password: `1234`)

## Brand reference

**Read `assets/images/brandguidline.txt` before any design change.** It is the source of truth for colors, typography, gradients, component specs, and animation rules.

Key values: blue `#7FB3FF`, violet `#C3A6FF`, pink `#FFB3C7`, mint `#A8E6CF`, bg `#F9FAFB`. Fonts: Poppins (titles 700–800) + Inter (body 300–400).

## Architecture

Pure HTML/CSS/JS — no build step, no framework, no bundler.

### Public site

| File | Role |
|---|---|
| `index.html` | One-page scroll: hero → marquee → services → stats (dark) → pourquoi-nous → portfolio preview → CTA band → contact → footer |
| `portfolio.html` | Standalone portfolio page with filter buttons (Tous / Vitrine / E-commerce) |
| `css/style.css` | All CSS variables, layout, components. The single source for the light theme. |
| `css/animations.css` | Reveal classes (`.reveal`, `.reveal-left`, `.reveal-right`), hero word stagger, custom cursor, heroFloat keyframes, page loader |
| `js/main.js` | Header scroll, smooth anchor scroll, hamburger, hero card tilt on mousemove, contact form validation |
| `js/animations.js` | Custom cursor (lerp 0.1), hero title word split into `.hero-word` spans, parallax orbs, IntersectionObserver reveal, eased counters (cubic ease-out), magnetic tilt on service/why/stat cards, active nav tracking |
| `js/preview.js` | Loaded on both `index.html` and `portfolio.html`. On load: fetches `/api/site-data` and applies it. Also listens for `postMessage` from the admin iframe (origin-checked). |

### Admin panel

| File | Role |
|---|---|
| `admin/index.html` | Login page — sends password to `/api/login` (PBKDF2-SHA512 backend), JWT cookie HttpOnly, lockout after 5 attempts (15 min) |
| `admin/dashboard.html` | 3-column layout: sidebar (240px) + editor (400px) + live preview iframe (1fr). All editor inputs have `data-field="section.key.path"` attributes. |
| `admin/css/admin.css` | Independent dark theme — variables prefixed separately from the public site. |
| `admin/js/admin.js` | Auth logic + full dashboard: checks `/api/me` on load (redirects to login if not authenticated), auto-binds `[data-field]` inputs, sends `postMessage` (same-origin only) on every keystroke, portfolio CRUD with modal, device toggle, saves via `/api/site-data`. |

### Admin ↔ site data flow

```
admin/js/admin.js
  └─ input change → setNestedValue(currentData, path, val)
       └─ sendToPreview(section)
            └─ iframe.contentWindow.postMessage({ type:'WC_UPDATE', section, data }, window.location.origin)

js/preview.js (loaded inside iframe)
  └─ message event (origin === window.location.origin) → switch(section) → applyHero / applyServices / ...
       └─ DOM mutations (no re-render, targeted updates)

Persistence: Netlify Blobs (store: webcraft-site, key: data)
  - Written by: admin.js saveData() → POST /api/site-data (requires JWT)
  - Read by: preview.js → GET /api/site-data on page load (public)
```

### Data model (`currentData` / `wc_site_data`)

```js
{
  hero:       { gradLine, normalLine, badge, subtitle, btn1Text, btn1Href, btn2Text, btn2Href, card1Title, card1Sub },
  services:   { header: { label, title, subtitle }, items: [{ emoji, title, desc, link, visible }×4] },
  stats:      { label, title, subtitle, items: [{ value, suffix, label }×4] },
  portfolio:  [{ emoji, name, desc, category }],   // category: 'vitrine' | 'ecommerce'
  contact:    { label, title, subtitle, email, instagram, linkedin, facebook },
  appearance: { blue, violet, pink, mint, bg, text },  // hex strings
  settings:   { siteName, tagline, copyright }
}
```

`appearance` is applied in the preview by injecting a `<style id="wc-preview-vars">` tag that overrides `:root` CSS variables — no page reload needed.

### Password change

Via the admin dashboard (Paramètres panel) → calls `POST /api/change-password` with `{ currentPassword, newPassword }`. The backend re-hashes with PBKDF2-SHA512 and a new random salt. Minimum 8 characters. No code change needed.
