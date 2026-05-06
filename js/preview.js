/* ─────────────────────────────────────────────────────────────────
   preview.js — Écoute les messages de l'admin et applique les
   modifications en direct sur le DOM du site.
   Chargé sur index.html ET portfolio.html.
───────────────────────────────────────────────────────────────── */

/* Charge les données sauvegardées et les applique au démarrage */
(function initFromStorage() {
  try {
    const raw = localStorage.getItem('wc_site_data');
    if (!raw) return;
    const data = JSON.parse(raw);
    applyAll(data);
  } catch {}
})();

/* ─── Écoute les messages de l'iframe parent (admin) ────────────── */
window.addEventListener('message', e => {
  const msg = e.data;
  if (!msg || msg.type !== 'WC_UPDATE') return;

  const { section, data } = msg;

  switch (section) {
    case 'all':         applyAll(data);               break;
    case 'hero':        applyHero(data.hero);         break;
    case 'services':    applyServices(data.services); break;
    case 'stats':       applyStats(data.stats);       break;
    case 'portfolio':   applyPortfolio(data.portfolio); break;
    case 'contact':     applyContact(data.contact);   break;
    case 'appearance':  applyAppearance(data.appearance); break;
    case 'settings':    applySettings(data.settings); break;
    case 'scroll':      scrollTo(data.target);        break;
  }
});

function applyAll(data) {
  if (!data) return;
  if (data.hero)       applyHero(data.hero);
  if (data.services)   applyServices(data.services);
  if (data.stats)      applyStats(data.stats);
  if (data.portfolio)  applyPortfolio(data.portfolio);
  if (data.contact)    applyContact(data.contact);
  if (data.appearance) applyAppearance(data.appearance);
  if (data.settings)   applySettings(data.settings);
}

/* ─── Hero ──────────────────────────────────────────────────────── */
function applyHero(h) {
  if (!h) return;

  /* Titre — ligne gradient */
  const gradSpan = document.querySelector('.hero-title .grad');
  if (gradSpan && h.gradLine !== undefined) {
    gradSpan.innerHTML = '';
    h.gradLine.trim().split(/\s+/).forEach(w => {
      const s = document.createElement('span');
      s.className = 'hero-word grad';
      s.textContent = w + ' ';
      s.style.cssText = 'opacity:1;transform:none;animation:none;';
      gradSpan.appendChild(s);
    });
  }

  /* Titre — ligne normale */
  if (h.normalLine !== undefined) {
    const h1 = document.querySelector('.hero-title');
    if (h1) {
      const existingNormal = [...h1.querySelectorAll('.hero-word:not(.grad)')];
      const newWords = h.normalLine.trim().split(/\s+/);
      if (existingNormal.length === newWords.length) {
        existingNormal.forEach((s, i) => { s.textContent = newWords[i] + ' '; });
      } else {
        existingNormal.forEach(s => s.remove());
        const br = h1.querySelector('br');
        const frag = document.createDocumentFragment();
        newWords.forEach(w => {
          const s = document.createElement('span');
          s.className = 'hero-word';
          s.textContent = w + ' ';
          s.style.cssText = 'opacity:1;transform:none;animation:none;';
          frag.appendChild(s);
        });
        br ? br.after(frag) : h1.appendChild(frag);
      }
    }
  }

  /* Badge disponibilité */
  if (h.badge !== undefined) {
    const badge = document.querySelector('.hero-badge');
    if (badge) {
      const dot = badge.querySelector('.hero-badge-dot');
      badge.textContent = ' ' + h.badge;
      if (dot) badge.prepend(dot);
    }
  }

  /* Sous-titre */
  setText('.hero-subtitle', h.subtitle);

  /* Bouton primaire */
  setTextHref('.hero-actions .btn-primary', h.btn1Text, h.btn1Href);
  /* Bouton secondaire */
  setTextHref('.hero-actions .btn-outline', h.btn2Text, h.btn2Href);

  /* Carte 1 — titre projet */
  setText('.hero-card:nth-child(1) .hero-card-title', h.card1Title);
  setText('.hero-card:nth-child(1) .hero-card-sub', h.card1Sub);
}

/* ─── Services ──────────────────────────────────────────────────── */
function applyServices(services) {
  if (!services) return;
  /* Compatibilité ancienne structure (tableau) et nouvelle (objet) */
  const items  = Array.isArray(services) ? services : (services.items || []);
  const hdr    = services.header || services._header;

  const cards = document.querySelectorAll('.service-card');
  items.forEach((svc, i) => {
    const card = cards[i];
    if (!card) return;
    if (!svc.visible) { card.style.display = 'none'; return; }
    card.style.display = '';
    const icon = card.querySelector('.service-icon');
    if (icon && svc.emoji) icon.textContent = svc.emoji;
    setText2(card, 'h3', svc.title);
    setText2(card, 'p',  svc.desc);
    const link = card.querySelector('.service-link');
    if (link && svc.link) link.textContent = svc.link;
  });

  /* En-tête section */
  if (hdr) {
    const header = document.querySelector('#services .services-header');
    if (header) {
      setText2(header, '.section-label',    hdr.label);
      setText2(header, '.section-title',    hdr.title);
      setText2(header, '.section-subtitle', hdr.subtitle);
    }
  }
}

/* ─── Stats ─────────────────────────────────────────────────────── */
function applyStats(stats) {
  if (!stats) return;
  if (stats.label)    setText('#stats .section-label', stats.label);
  if (stats.title)    setText('#stats .section-title', stats.title);
  if (stats.subtitle) setText('#stats .section-subtitle', stats.subtitle);
  if (Array.isArray(stats.items)) {
    const cards = document.querySelectorAll('#stats .stat-number');
    stats.items.forEach((item, i) => {
      if (!cards[i]) return;
      cards[i].dataset.target = item.value;
      cards[i].dataset.suffix = item.suffix;
      cards[i].textContent   = item.value + item.suffix;
      const label = cards[i].nextElementSibling;
      if (label) label.textContent = item.label;
    });
  }
}

/* ─── Portfolio ─────────────────────────────────────────────────── */
function applyPortfolio(items) {
  if (!Array.isArray(items)) return;

  /* Preview accueil — 3 premières cartes */
  const previewGrid = document.querySelector('#portfolio-preview .portfolio-grid');
  if (previewGrid) {
    previewGrid.innerHTML = items.slice(0, 3).map(item => `
      <div class="portfolio-card">
        <div class="portfolio-placeholder">${escHtml(item.emoji)}</div>
        <div class="portfolio-overlay">
          <span class="portfolio-tag">${item.category === 'ecommerce' ? 'E-commerce' : 'Vitrine'}</span>
          <h3>${escHtml(item.name)}</h3>
          <p>${escHtml(item.desc)}</p>
        </div>
      </div>
    `).join('');
  }

  /* Page portfolio complète */
  const fullGrid = document.getElementById('portfolio-grid');
  if (fullGrid) {
    fullGrid.innerHTML = items.map(item => `
      <div class="pf-card reveal visible" data-category="${escHtml(item.category)}">
        <div class="pf-thumb">${escHtml(item.emoji)}</div>
        <div class="pf-info">
          <div class="pf-tags">
            <span class="pf-tag ${escHtml(item.category)}">
              ${item.category === 'ecommerce' ? 'E-commerce' : 'Vitrine'}
            </span>
          </div>
          <h3>${escHtml(item.name)}</h3>
          <p>${escHtml(item.desc)}</p>
          <span class="pf-link">Voir le projet →</span>
        </div>
      </div>
    `).join('');
  }
}

/* ─── Contact ───────────────────────────────────────────────────── */
function applyContact(c) {
  if (!c) return;
  const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
  emailLinks.forEach(a => {
    if (c.email) { a.href = 'mailto:' + c.email; a.textContent = c.email; }
  });
  setSocialHref('Instagram', c.instagram);
  setSocialHref('LinkedIn',  c.linkedin);
  setSocialHref('Facebook',  c.facebook);
  if (c.label)    setText('#contact .section-label', c.label);
  if (c.title)    setText('#contact .section-title', c.title);
  if (c.subtitle) setText('#contact .section-subtitle', c.subtitle);
}

/* ─── Apparence (CSS variables) ─────────────────────────────────── */
function applyAppearance(a) {
  if (!a) return;
  let styleEl = document.getElementById('wc-preview-vars');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'wc-preview-vars';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `:root {
    --blue:      ${a.blue   || '#7FB3FF'};
    --violet:    ${a.violet || '#C3A6FF'};
    --pink:      ${a.pink   || '#FFB3C7'};
    --mint:      ${a.mint   || '#A8E6CF'};
    --bg:        ${a.bg     || '#F9FAFB'};
    --text:      ${a.text   || '#1F2937'};
    --grad-main: linear-gradient(135deg, ${a.blue || '#7FB3FF'}, ${a.violet || '#C3A6FF'});
    --grad-hero: linear-gradient(135deg, ${a.blue || '#7FB3FF'}, ${a.violet || '#C3A6FF'} 55%, ${a.pink || '#FFB3C7'});
    --grad-warm: linear-gradient(135deg, ${a.violet || '#C3A6FF'}, ${a.pink || '#FFB3C7'});
    --grad-mint: linear-gradient(135deg, ${a.blue || '#7FB3FF'}, ${a.mint || '#A8E6CF'});
  }`;
}

/* ─── Settings ──────────────────────────────────────────────────── */
function applySettings(s) {
  if (!s) return;
  if (s.siteName) document.title = s.siteName + ' — ' + (s.tagline || '');
  setText('footer .footer-text', s.copyright);
}

/* ─── Scroll vers une section ────────────────────────────────────── */
function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function setText(selector, value) {
  if (value === undefined) return;
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}
function setText2(parent, selector, value) {
  if (value === undefined || !parent) return;
  const el = parent.querySelector(selector);
  if (el) el.textContent = value;
}
function setTextHref(selector, text, href) {
  const el = document.querySelector(selector);
  if (!el) return;
  if (text !== undefined) el.textContent = text;
  if (href !== undefined) el.href = href;
}
function setSocialHref(label, url) {
  if (url === undefined) return;
  const link = document.querySelector(`.social-link[aria-label="${label}"]`);
  if (link && url) link.href = url;
}
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Signale à l'admin que la page est prête à recevoir des mises à jour */
if (window.parent !== window) {
  window.parent.postMessage({ type: 'WC_READY' }, '*');
}
