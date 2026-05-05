const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'x-admin-hash',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };

  /* ── Auth ── */
  const hash         = event.headers['x-admin-hash'];
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedHash) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'ADMIN_PASSWORD_HASH non configuré dans les variables Netlify' }) };
  }
  if (!hash || hash !== expectedHash) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorisé — reconnectez-vous à l\'admin' }) };
  }

  /* ── Lecture depuis Netlify Blobs ── */
  const store = getStore('contact-messages');
  const index = await store.get('__index', { type: 'json' }).catch(() => []);

  if (!Array.isArray(index) || index.length === 0) {
    return { statusCode: 200, headers, body: JSON.stringify([]) };
  }

  const messages = await Promise.all(
    index.map(id => store.get(id, { type: 'json' }).catch(() => null))
  );

  return { statusCode: 200, headers, body: JSON.stringify(messages.filter(Boolean)) };
};
