'use strict';
const { messagesStore, blobGet, requireAuth, json } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'GET') return json(405, { error: 'Méthode non autorisée' });

  const auth = await requireAuth(event);
  if (!auth) return json(401, { error: 'Non autorisé' });

  const store = messagesStore();
  const index = (await blobGet(store, '__index')) || [];
  if (!index.length) return json(200, []);

  const messages = await Promise.all(index.map(id => blobGet(store, id)));
  return json(200, messages.filter(Boolean));
};
