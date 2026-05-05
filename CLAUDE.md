# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev server

```
npx serve -p 3000
```

Must be run from `C:\site_pro`. The admin panel uses `postMessage` across iframes — this only works over HTTP, not `file://`. Always serve before testing admin ↔ site communication.

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
| `js/preview.js` | Loaded on both `index.html` and `portfolio.html`. On load: reads `localStorage('wc_site_data')` and applies it. Also listens for `postMessage` from the admin iframe. |

### Admin panel

| File | Role |
|---|---|
| `admin/index.html` | Login page — SHA-256 password check, lockout after 5 attempts (15 min), session stored in `sessionStorage` (2h TTL) |
| `admin/dashboard.html` | 3-column layout: sidebar (240px) + editor (400px) + live preview iframe (1fr). All editor inputs have `data-field="section.key.path"` attributes. |
| `admin/css/admin.css` | Independent dark theme — variables prefixed separately from the public site. |
| `admin/js/admin.js` | Auth logic + full dashboard: auto-binds `[data-field]` inputs, sends `postMessage` on every keystroke, portfolio CRUD with modal, device toggle, save to `localStorage`. |

### Admin ↔ site data flow

```
admin/js/admin.js
  └─ input change → setNestedValue(currentData, path, val)
       └─ sendToPreview(section)
            └─ iframe.contentWindow.postMessage({ type:'WC_UPDATE', section, data: currentData }, '*')

js/preview.js (loaded inside iframe)
  └─ window.addEventListener('message') → switch(section) → applyHero / applyServices / ...
       └─ DOM mutations (no re-render, targeted updates)

Persistence: localStorage key 'wc_site_data' (JSON)
  - Written by: admin.js saveData() on every "Enregistrer" click
  - Read by: preview.js initFromStorage() on page load (applies saved state without admin)
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

`PASSWORD_HASH` in `admin/js/admin.js` line 2 is SHA-256 of `"1234"`. To change: compute `sha256(newPassword)` and replace the constant. No backend required.
