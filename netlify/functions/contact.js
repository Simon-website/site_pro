'use strict';
const crypto = require('crypto');
const { messagesStore, blobGet, blobSet, json } = require('./lib/auth');

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

  if (!String(name || '').trim() || !String(email || '').trim() || !String(message || '').trim()) {
    return json(400, { error: 'Tous les champs sont requis' });
  }

  const store = messagesStore();
  const index = (await blobGet(store, '__index')) || [];
  const id    = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const entry = {
    id, number: index.length + 1,
    name: name.trim(), email: email.trim(), message: message.trim(),
    date: new Date().toISOString(),
  };

  await blobSet(store, id, entry);
  index.unshift(id);
  await blobSet(store, '__index', index);

  return json(200, { success: true });
};
