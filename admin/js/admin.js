/* ─── Icônes SVG ─────────────────────────────────────────────────── */
const EYE_ICON     = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ─── Helper fetch API ───────────────────────────────────────────── */
async function apiFetch(url, opts = {}) {
  const res  = await fetch(url, { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
  return data;
}

/* ─────────────────────────────────────────────────────────────────
   PAGE LOGIN
───────────────────────────────────────────────────────────────── */
const loginForm = document.getElementById('login-form');
if (loginForm) {
  /* Redirige si session déjà active */
  apiFetch('/api/me').then(d => { if (d.authenticated) window.location.href = 'dashboard.html'; }).catch(() => {});

  const pwdInput   = document.getElementById('pwd');
  const eyeBtn     = document.getElementById('eye-btn');
  const errEl      = document.getElementById('login-error');
  const attemptsEl = document.getElementById('attempts-left');
  const submitBtn  = document.getElementById('login-btn');

  eyeBtn?.addEventListener('click', () => {
    const isText = pwdInput.type === 'text';
    pwdInput.type = isText ? 'password' : 'text';
    eyeBtn.innerHTML = isText ? EYE_ICON : EYE_OFF_ICON;
  });

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Vérification…';
    errEl.classList.remove('show');
    attemptsEl.textContent = '';

    try {
      const res  = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password: pwdInput.value }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        submitBtn.textContent      = '✓ Accès autorisé';
        submitBtn.style.background = 'linear-gradient(135deg,#3fb950,#2ea043)';
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
      } else {
        pwdInput.classList.add('error');
        errEl.textContent = data.error || 'Mot de passe incorrect';
        errEl.classList.add('show');

        if (res.status === 429) {
          submitBtn.textContent = 'Bloqué';
        } else {
          if (data.attemptsLeft !== undefined) {
            attemptsEl.textContent = `${data.attemptsLeft} tentative(s) restante(s)`;
          }
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Accéder au panneau';
        }

        pwdInput.addEventListener('input', () => {
          pwdInput.classList.remove('error');
          errEl.classList.remove('show');
        }, { once: true });
      }
    } catch {
      errEl.textContent = 'Erreur de connexion. Vérifiez votre réseau.';
      errEl.classList.add('show');
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Accéder au panneau';
    }
  });
}

/* ─────────────────────────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────────────────────────── */
if (document.getElementById('admin-dashboard')) {

  /* ── Modèle de données par défaut ── */
  const DEFAULT_DATA = {
    hero: {
      gradLine:   'Web Code,',
      normalLine: 'You Grow.',
      badge:      'Disponible pour de nouveaux projets',
      subtitle:   'WebCraft crée des sites vitrine et e-commerce sur mesure pour artisans, commerçants et indépendants. Design soigné, livraison rapide, résultats concrets.',
      btn1Text:   'Voir nos réalisations →',
      btn1Href:   'portfolio.html',
      btn2Text:   'Nous contacter',
      btn2Href:   '#contact',
      card1Title: 'Atelier Léonie — E-commerce',
      card1Sub:   'Livré en 18 jours · Design sur mesure',
    },
    services: {
      header: {
        label:    'Ce que nous faisons',
        title:    'Nos services',
        subtitle: 'Des solutions web adaptées à chaque activité, pensées pour les petites structures ambitieuses.',
      },
      items: [
        { emoji: '🌐', title: 'Site vitrine',           desc: 'Un site élégant et professionnel pour présenter votre activité, attirer des clients et renforcer votre crédibilité en ligne.',           link: 'Demander un devis →',      visible: true },
        { emoji: '🛒', title: 'Boutique e-commerce',    desc: 'Vendez en ligne 24h/24 avec une boutique sur mesure : catalogue produits, paiement sécurisé, gestion des commandes.',                    link: 'Demander un devis →',      visible: true },
        { emoji: '⚡', title: 'Refonte & optimisation', desc: "Votre site actuel est daté ou lent ? Nous le modernisons pour qu'il performe sur tous les appareils et navigateurs.",                    link: 'Discuter de mon projet →', visible: true },
        { emoji: '🛡️', title: 'Maintenance & suivi',   desc: "On s'occupe des mises à jour, de la sécurité et du bon fonctionnement de votre site.",                                                   link: 'En savoir plus →',         visible: true },
      ]
    },
    stats: {
      label:    'Les chiffres parlent',
      title:    'Des résultats concrets',
      subtitle: 'Chaque projet livré est une histoire de croissance.',
      items: [
        { value: 50,  suffix: '+', label: 'Projets livrés' },
        { value: 100, suffix: '%', label: 'Clients satisfaits' },
        { value: 18,  suffix: 'j', label: 'Délai moyen de livraison' },
        { value: 3,   suffix: '×', label: 'Trafic moyen après lancement' },
      ]
    },
    portfolio: [
      { emoji: '🍕', name: 'Pizzeria Da Marco',    desc: 'Menu consultable en ligne, formulaire de réservation et galerie photos appétissante.',                               category: 'vitrine'   },
      { emoji: '👗', name: 'Atelier Léonie',        desc: 'Boutique en ligne pour une créatrice de mode. Catalogue, paiement Stripe, gestion commandes.',                      category: 'ecommerce' },
      { emoji: '🔧', name: 'Plomberie Renaud',      desc: "Site professionnel avec zone d'intervention, tarifs clairs et bouton d'appel direct mis en avant.",                 category: 'vitrine'   },
      { emoji: '🍰', name: 'Pâtisserie Soleil',     desc: 'Commandes en ligne avec sélection de la date de retrait — zéro attente en boutique.',                              category: 'ecommerce' },
      { emoji: '💆', name: 'Institut Zen & Beauté', desc: 'Présentation des soins, galerie, et système de prise de RDV en ligne intégré.',                                    category: 'vitrine'   },
      { emoji: '🪴', name: 'La Serre Verte',        desc: 'E-commerce de plantes et accessoires de jardinage. Fiches produits, stocks et livraison intégrés.',                category: 'ecommerce' },
    ],
    contact: {
      label:     'Parlons de votre projet',
      title:     'Contactez-nous',
      subtitle:  'Décrivez-nous votre projet et nous vous répondons sous 24h.',
      email:     'contact@webcraft.fr',
      instagram: '',
      linkedin:  '',
      facebook:  '',
    },
    appearance: {
      blue:   '#7FB3FF',
      violet: '#C3A6FF',
      pink:   '#FFB3C7',
      mint:   '#A8E6CF',
      bg:     '#F9FAFB',
      text:   '#1F2937',
    },
    settings: {
      siteName:  'WebCraft',
      tagline:   'Web Code, You Grow.',
      copyright: '© 2025 WebCraft. Tous droits réservés.',
    }
  };

  function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key]) {
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  async function loadData() {
    try {
      const data = await apiFetch('/api/site-data');
      return data
        ? deepMerge(JSON.parse(JSON.stringify(DEFAULT_DATA)), data)
        : JSON.parse(JSON.stringify(DEFAULT_DATA));
    } catch { return JSON.parse(JSON.stringify(DEFAULT_DATA)); }
  }

  async function saveData() {
    await apiFetch('/api/site-data', { method: 'POST', body: JSON.stringify(currentData) });
  }

  let currentData = null;

  /* ── iframe preview ── */
  const iframe       = document.getElementById('preview-iframe');
  const previewUrlEl = document.querySelector('.preview-url-bar');
  let iframeReady    = false;

  function sendToPreview(section) {
    if (!iframe || !iframeReady) return;
    iframe.contentWindow.postMessage({ type: 'WC_UPDATE', section, data: currentData }, window.location.origin);
  }
  function sendAll() { sendToPreview('all'); }

  iframe?.addEventListener('load', () => {
    if (previewUrlEl) {
      try { previewUrlEl.textContent = decodeURIComponent(iframe.src.split('/').slice(-2).join('/')); }
      catch { previewUrlEl.textContent = iframe.src; }
    }
  });

  window.addEventListener('message', e => {
    if (e.source !== iframe?.contentWindow) return;
    if (e.data?.type === 'WC_READY') { iframeReady = true; sendAll(); }
  });

  function setPreviewPage(url) { iframeReady = false; iframe.src = url; }

  /* ── Navigation sidebar ── */
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-panel]');
  const panels       = document.querySelectorAll('.admin-panel');
  const breadcrumb   = document.querySelector('.topbar-breadcrumb .current');

  function activatePanel(id) {
    panels.forEach(p => p.classList.toggle('active', p.id === id));
    sidebarItems.forEach(i => i.classList.toggle('active', i.dataset.panel === id));
    if (breadcrumb) {
      const label = document.querySelector(`.sidebar-item[data-panel="${id}"] .sidebar-label`)?.textContent;
      if (label) breadcrumb.textContent = label;
    }
    if (iframe) {
      const needsPortfolio = id === 'panel-portfolio';
      const currentSrc = iframe.src || '';
      if (needsPortfolio && !currentSrc.includes('portfolio.html')) setPreviewPage('../portfolio.html');
      else if (!needsPortfolio && currentSrc.includes('portfolio.html')) setPreviewPage('../index.html');
    }
  }

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      activatePanel(item.dataset.panel);
      if (item.dataset.panel === 'panel-messages' && !messagesLoaded) loadMessages();
    });
  });

  /* ── Helpers accès objet par chemin ── */
  function getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
  }
  function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] == null) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
  }

  /* ── Binding automatique [data-field] ── */
  function bindDataFields() {
    document.querySelectorAll('[data-field]').forEach(el => {
      const path = el.dataset.field;
      const val  = getNestedValue(currentData, path);
      if (val !== undefined) {
        if (el.type === 'checkbox') el.checked = !!val;
        else el.value = val;
      }

      el.addEventListener('input', () => {
        let newVal;
        if (el.type === 'checkbox')    newVal = el.checked;
        else if (el.type === 'number') newVal = Number(el.value);
        else                           newVal = el.value;

        setNestedValue(currentData, path, newVal);

        if (el.type === 'color') {
          const hexEl = el.closest('.color-item')?.querySelector('.color-item-hex');
          if (hexEl) hexEl.textContent = el.value.toUpperCase();
        }

        if (path.startsWith('services.items.') && path.endsWith('.emoji')) {
          const idx = parseInt(path.split('.')[2]);
          document.querySelectorAll('.service-item-emoji')[idx].textContent = newVal;
        }
        if (path.startsWith('services.items.') && path.endsWith('.title')) {
          const idx = parseInt(path.split('.')[2]);
          document.querySelectorAll('.service-item-name')[idx].textContent = newVal;
        }

        sendToPreview(path.split('.')[0]);
        markUnsaved();
      });
    });
  }

  /* ── Indicateur de sauvegarde ── */
  const saveIndicator = document.getElementById('save-indicator');
  function markUnsaved() {
    if (saveIndicator) {
      saveIndicator.textContent = 'Modifications non sauvegardées';
      saveIndicator.classList.remove('saved');
    }
  }
  function markSaved() {
    if (saveIndicator) {
      saveIndicator.textContent = 'Enregistré ✓';
      saveIndicator.classList.add('saved');
      setTimeout(() => { saveIndicator.textContent = ''; saveIndicator.classList.remove('saved'); }, 3000);
    }
  }

  /* ── Toast ── */
  window.showToast = function(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.querySelector('.toast-msg').textContent = msg;
    toast.className = `show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3200);
  };
  const showToast = window.showToast;

  /* ── Boutons Enregistrer ── */
  document.querySelectorAll('[data-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await saveData();
        markSaved();
        showToast('Modifications enregistrées ✓');
        sendAll();
      } catch { showToast('Erreur lors de la sauvegarde', 'warning'); }
    });
  });

  /* ── Déconnexion ── */
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try { await apiFetch('/api/logout', { method: 'POST' }); } catch {}
    window.location.href = 'index.html';
  });

  /* ── Voir le site ── */
  document.getElementById('view-site-btn')?.addEventListener('click', () => {
    window.open('../index.html', '_blank');
  });

  /* ── Accordéons services ── */
  document.querySelectorAll('.service-item-header').forEach(header => {
    header.addEventListener('click', () => header.closest('.service-item').classList.toggle('open'));
  });

  /* ── Device toggle preview ── */
  const previewWrap = document.querySelector('.preview-iframe-wrap');
  document.querySelectorAll('.device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (!previewWrap) return;
      const device = btn.dataset.device;
      if (device === 'mobile')       { previewWrap.style.maxWidth = '390px'; previewWrap.style.margin = '0 auto'; }
      else if (device === 'tablet')  { previewWrap.style.maxWidth = '768px'; previewWrap.style.margin = '0 auto'; }
      else                           { previewWrap.style.maxWidth = '';      previewWrap.style.margin = ''; }
    });
  });

  /* ── Rafraîchir preview ── */
  document.getElementById('refresh-preview')?.addEventListener('click', () => {
    iframeReady = false;
    iframe.src = iframe.src;
  });

  /* ── Portfolio CRUD ── */
  function renderPortfolioAdmin() {
    const grid = document.getElementById('admin-portfolio-grid');
    if (!grid) return;
    const n = currentData.portfolio.length;
    document.querySelectorAll('#portfolio-count, #portfolio-count-card').forEach(el => el.textContent = n);

    grid.innerHTML = currentData.portfolio.map((item, i) => `
      <div class="portfolio-item" data-index="${i}">
        <div class="portfolio-thumb">
          ${escHtml(item.emoji)}
          <div class="portfolio-thumb-actions">
            <button class="btn-admin sm" onclick="editPortfolioItem(${i})">✏️ Éditer</button>
            <button class="btn-admin sm danger" onclick="deletePortfolioItem(${i})">🗑️</button>
          </div>
        </div>
        <div class="portfolio-info">
          <div class="portfolio-info-name">${escHtml(item.name)}</div>
          <div class="portfolio-info-meta">
            <span class="portfolio-info-tag ${escHtml(item.category)}">${item.category === 'ecommerce' ? 'E-commerce' : 'Vitrine'}</span>
            <button class="btn-admin sm" onclick="editPortfolioItem(${i})">Éditer</button>
          </div>
        </div>
      </div>
    `).join('') + `
      <button class="portfolio-add" onclick="addPortfolioItem()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Ajouter un projet
      </button>
    `;
  }

  window.editPortfolioItem = function(i) {
    const item  = currentData.portfolio[i];
    const modal = document.getElementById('portfolio-modal');
    document.getElementById('modal-title').textContent    = `Modifier : ${item.name}`;
    document.getElementById('modal-emoji').value          = item.emoji;
    document.getElementById('modal-name').value           = item.name;
    document.getElementById('modal-desc').value           = item.desc;
    document.getElementById('modal-category').value       = item.category;
    document.getElementById('modal-save').onclick = async () => {
      currentData.portfolio[i] = {
        emoji:    document.getElementById('modal-emoji').value,
        name:     document.getElementById('modal-name').value,
        desc:     document.getElementById('modal-desc').value,
        category: document.getElementById('modal-category').value,
      };
      try {
        await saveData();
        renderPortfolioAdmin();
        sendToPreview('portfolio');
        modal.classList.remove('open');
        showToast('Projet mis à jour ✓');
      } catch { showToast('Erreur de sauvegarde', 'warning'); }
    };
    modal.classList.add('open');
  };

  window.deletePortfolioItem = async function(i) {
    if (!confirm(`Supprimer "${currentData.portfolio[i].name}" ?`)) return;
    currentData.portfolio.splice(i, 1);
    try {
      await saveData();
      renderPortfolioAdmin();
      sendToPreview('portfolio');
      showToast('Projet supprimé', 'warning');
    } catch { showToast('Erreur de sauvegarde', 'warning'); }
  };

  window.addPortfolioItem = async function() {
    currentData.portfolio.push({ emoji: '🌟', name: 'Nouveau projet', desc: 'Description du projet.', category: 'vitrine' });
    try {
      await saveData();
      renderPortfolioAdmin();
      sendToPreview('portfolio');
      editPortfolioItem(currentData.portfolio.length - 1);
    } catch { showToast('Erreur de sauvegarde', 'warning'); }
  };

  /* ── Modal portfolio (fermeture) ── */
  const modal = document.getElementById('portfolio-modal');
  document.getElementById('modal-close')?.addEventListener('click', () => modal.classList.remove('open'));
  document.getElementById('modal-cancel')?.addEventListener('click', () => modal.classList.remove('open'));
  modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

  document.getElementById('add-portfolio-btn')?.addEventListener('click', addPortfolioItem);

  /* ── Messages reçus ── */
  let messagesLoaded = false;

  async function loadMessages() {
    const loadingEl = document.getElementById('messages-loading');
    const errorEl   = document.getElementById('messages-error');
    const emptyEl   = document.getElementById('messages-empty');
    const listEl    = document.getElementById('messages-list');
    const badge     = document.getElementById('messages-badge');

    [errorEl, emptyEl, listEl].forEach(el => { if (el) el.style.display = 'none'; });
    if (loadingEl) loadingEl.style.display = 'flex';

    try {
      const messages = await apiFetch('/api/messages');
      if (loadingEl) loadingEl.style.display = 'none';

      if (!messages.length) {
        if (emptyEl) emptyEl.style.display = 'flex';
        if (badge)   badge.style.display = 'none';
        return;
      }

      if (badge) { badge.textContent = messages.length; badge.style.display = ''; }

      listEl.style.display = 'block';
      listEl.innerHTML = messages.map(m => {
        const date = new Date(m.date).toLocaleString('fr-FR', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        return `
          <div class="message-card">
            <div class="message-card-header">
              <div class="message-meta">
                <span class="message-name">${escHtml(m.name)}</span>
                <a class="message-email" href="mailto:${escHtml(m.email)}">${escHtml(m.email)}</a>
              </div>
              <span class="message-date">${date}</span>
            </div>
            <div class="message-body">${escHtml(m.message)}</div>
            <div class="message-footer">
              <span class="message-num">#${m.number}</span>
              <a class="btn-admin sm" href="mailto:${escHtml(m.email)}?subject=Re: votre message&body=Bonjour ${escHtml(m.name)},%0A%0A">
                ✉️ Répondre
              </a>
            </div>
          </div>`;
      }).join('');

      messagesLoaded = true;
    } catch (err) {
      if (loadingEl) loadingEl.style.display = 'none';
      const errText = document.getElementById('messages-error-text');
      if (errText) errText.textContent = `Erreur : ${err.message}`;
      if (errorEl) errorEl.style.display = 'flex';
    }
  }

  document.getElementById('refresh-messages-btn')?.addEventListener('click', () => {
    messagesLoaded = false;
    loadMessages();
  });

  /* ── Changement de mot de passe ── */
  document.getElementById('change-password-btn')?.addEventListener('click', async () => {
    const current = document.getElementById('current-password')?.value || '';
    const p1      = document.getElementById('new-password')?.value     || '';
    const p2      = document.getElementById('confirm-password')?.value || '';
    if (!current)    return showToast('Saisissez votre mot de passe actuel', 'warning');
    if (!p1)         return showToast('Saisissez un nouveau mot de passe', 'warning');
    if (p1 !== p2)   return showToast('Les mots de passe ne correspondent pas', 'warning');
    if (p1.length < 8) return showToast('Le mot de passe doit faire au moins 8 caractères', 'warning');
    try {
      await apiFetch('/api/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: p1 }),
      });
      showToast('Mot de passe modifié ✓');
      ['current-password', 'new-password', 'confirm-password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    } catch (err) { showToast(err.message || 'Erreur', 'warning'); }
  });

  /* ── Initialisation asynchrone ── */
  (async () => {
    try {
      const me = await apiFetch('/api/me');
      if (!me.authenticated) { window.location.href = 'index.html'; return; }
    } catch { window.location.href = 'index.html'; return; }

    currentData = await loadData();
    bindDataFields();
    renderPortfolioAdmin();
  })();
}
