'use strict';
const { siteStore, blobGet, blobSet, requireAuth, json } = require('./lib/auth');

const HEX_RE      = /^#[0-9a-fA-F]{3,8}$/;
const SAFE_HREF_RE = /^(https?:\/\/|\/|#)/i;

function safeHref(v) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  return SAFE_HREF_RE.test(s) ? s : '#';
}
function safeColor(v, fallback) {
  return (typeof v === 'string' && HEX_RE.test(v.trim())) ? v.trim() : fallback;
}
function sanitizeStr(v, max = 500) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function sanitizeData(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const d = {};

  /* hero */
  if (raw.hero && typeof raw.hero === 'object') {
    const h = raw.hero;
    d.hero = {
      gradLine:   sanitizeStr(h.gradLine, 200),
      normalLine: sanitizeStr(h.normalLine, 200),
      badge:      sanitizeStr(h.badge, 200),
      subtitle:   sanitizeStr(h.subtitle, 500),
      btn1Text:   sanitizeStr(h.btn1Text, 100),
      btn1Href:   safeHref(h.btn1Href),
      btn2Text:   sanitizeStr(h.btn2Text, 100),
      btn2Href:   safeHref(h.btn2Href),
      card1Title: sanitizeStr(h.card1Title, 200),
      card1Sub:   sanitizeStr(h.card1Sub, 200),
    };
  }

  /* services */
  if (raw.services && typeof raw.services === 'object') {
    const s = raw.services;
    d.services = {
      header: s.header ? {
        label:    sanitizeStr(s.header.label, 100),
        title:    sanitizeStr(s.header.title, 200),
        subtitle: sanitizeStr(s.header.subtitle, 500),
      } : undefined,
      items: Array.isArray(s.items) ? s.items.slice(0, 10).map(it => ({
        emoji:   sanitizeStr(it.emoji, 10),
        title:   sanitizeStr(it.title, 100),
        desc:    sanitizeStr(it.desc, 500),
        link:    sanitizeStr(it.link, 100),
        visible: !!it.visible,
      })) : [],
    };
  }

  /* stats */
  if (raw.stats && typeof raw.stats === 'object') {
    const s = raw.stats;
    d.stats = {
      label:    sanitizeStr(s.label, 100),
      title:    sanitizeStr(s.title, 200),
      subtitle: sanitizeStr(s.subtitle, 500),
      items: Array.isArray(s.items) ? s.items.slice(0, 10).map(it => ({
        value:  Number(it.value) || 0,
        suffix: sanitizeStr(it.suffix, 10),
        label:  sanitizeStr(it.label, 100),
      })) : [],
    };
  }

  /* portfolio */
  if (Array.isArray(raw.portfolio)) {
    d.portfolio = raw.portfolio.slice(0, 50).map(it => ({
      emoji:    sanitizeStr(it.emoji, 10),
      name:     sanitizeStr(it.name, 100),
      desc:     sanitizeStr(it.desc, 500),
      category: ['vitrine', 'ecommerce'].includes(it.category) ? it.category : 'vitrine',
    }));
  }

  /* contact */
  if (raw.contact && typeof raw.contact === 'object') {
    const c = raw.contact;
    d.contact = {
      label:     sanitizeStr(c.label, 100),
      title:     sanitizeStr(c.title, 200),
      subtitle:  sanitizeStr(c.subtitle, 500),
      email:     sanitizeStr(c.email, 100),
      instagram: safeHref(c.instagram),
      linkedin:  safeHref(c.linkedin),
      facebook:  safeHref(c.facebook),
    };
  }

  /* appearance — hex colors only */
  if (raw.appearance && typeof raw.appearance === 'object') {
    const a = raw.appearance;
    d.appearance = {
      blue:   safeColor(a.blue,   '#7FB3FF'),
      violet: safeColor(a.violet, '#C3A6FF'),
      pink:   safeColor(a.pink,   '#FFB3C7'),
      mint:   safeColor(a.mint,   '#A8E6CF'),
      bg:     safeColor(a.bg,     '#F9FAFB'),
      text:   safeColor(a.text,   '#1F2937'),
    };
  }

  /* settings */
  if (raw.settings && typeof raw.settings === 'object') {
    const s = raw.settings;
    d.settings = {
      siteName:  sanitizeStr(s.siteName, 100),
      tagline:   sanitizeStr(s.tagline, 200),
      copyright: sanitizeStr(s.copyright, 200),
    };
  }

  return d;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };

  const store = siteStore();

  /* Lecture publique */
  if (event.httpMethod === 'GET') {
    const data = await blobGet(store, 'data');
    return json(200, data);
  }

  /* Écriture protégée */
  if (event.httpMethod === 'POST') {
    const auth = await requireAuth(event);
    if (!auth) return json(401, { error: 'Non autorisé' });

    if ((event.body || '').length > 200_000) return json(413, { error: 'Payload trop volumineux' });

    let raw;
    try { raw = JSON.parse(event.body || 'null'); } catch { return json(400, { error: 'JSON invalide' }); }

    const data = sanitizeData(raw);
    if (!data) return json(400, { error: 'Données invalides' });

    await blobSet(store, 'data', data);
    return json(200, { success: true });
  }

  return json(405, { error: 'Méthode non autorisée' });
};
