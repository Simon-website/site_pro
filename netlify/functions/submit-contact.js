const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };

  let name, email, message;
  try {
    const ct = event.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      ({ name, email, message } = JSON.parse(event.body));
    } else {
      const p = new URLSearchParams(event.body);
      name    = p.get('name');
      email   = p.get('email');
      message = p.get('message');
    }
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Corps invalide' }) };
  }

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Champs manquants' }) };
  }

  const store = getStore('contact-messages');
  const id    = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const existing = await store.get('__index', { type: 'json' }).catch(() => []);
  const index    = Array.isArray(existing) ? existing : [];
  const number   = index.length + 1;

  const entry = { id, number, name: name.trim(), email: email.trim(), message: message.trim(), date: new Date().toISOString() };

  await store.setJSON(id, entry);
  index.unshift(id);
  await store.setJSON('__index', index);

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
};
