'use strict';
const crypto = require('crypto');
const { messagesStore, adminStore, blobGet, blobSet, json } = require('./lib/auth');

const MAX_NAME    = 100;
const MAX_EMAIL   = 100;
const MAX_MESSAGE = 2000;
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Rate limiting : max 5 soumissions par IP par heure */
const CONTACT_LIMIT  = 5;
const CONTACT_WIN_MS = 60 * 60 * 1000;

function contactKey(event) {
  const ip = (event.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  return `contact-rate-${ip.replace(/[^a-z0-9]/gi, '-').slice(0, 60)}`;
}

async function checkContactRate(event) {
  const store = adminStore();
  const key   = contactKey(event);
  const entry = (await blobGet(store, key)) || { count: 0, windowStart: Date.now() };

  if (Date.now() - entry.windowStart > CONTACT_WIN_MS) {
    entry.count = 0;
    entry.windowStart = Date.now();
  }

  if (entry.count >= CONTACT_LIMIT) return false;

  entry.count++;
  await blobSet(store, key, entry);
  return true;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Méthode non autorisée' });

  let name, email, message;
  try {
    const ct = event.headers?.['content-type'] || '';
    if (ct.includes('application/json')) {
      ({ name, email, message } = JSON.parse(event.body));
    } else {
      const p = new URLSearchParams(event.body);
      name = p.get('name'); email = p.get('email'); message = p.get('message');
    }
  } catch { return json(400, { error: 'Corps invalide' }); }

  const n = String(name    || '').trim();
  const e = String(email   || '').trim();
  const m = String(message || '').trim();

  if (!n || !e || !m) return json(400, { error: 'Tous les champs sont requis' });
  if (n.length > MAX_NAME)    return json(400, { error: `Le nom ne doit pas dépasser ${MAX_NAME} caractères` });
  if (e.length > MAX_EMAIL)   return json(400, { error: `L'email ne doit pas dépasser ${MAX_EMAIL} caractères` });
  if (m.length > MAX_MESSAGE) return json(400, { error: `Le message ne doit pas dépasser ${MAX_MESSAGE} caractères` });
  if (!EMAIL_RE.test(e))      return json(400, { error: 'Adresse email invalide' });

  const allowed = await checkContactRate(event);
  if (!allowed) return json(429, { error: 'Trop de messages envoyés. Réessayez dans une heure.' });

  const store = messagesStore();
  const index = (await blobGet(store, '__index')) || [];
  const id    = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const entry = {
    id, number: index.length + 1,
    name: n, email: e, message: m,
    date: new Date().toISOString(),
  };

  await blobSet(store, id, entry);
  index.unshift(id);
  await blobSet(store, '__index', index);

  return json(200, { success: true });
};
