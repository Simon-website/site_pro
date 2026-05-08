'use strict';
const { siteStore, blobGet, blobSet, requireAuth, json } = require('./lib/auth');

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

    let data;
    try { data = JSON.parse(event.body || 'null'); } catch { return json(400, { error: 'JSON invalide' }); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json(400, { error: 'Données invalides' });

    await blobSet(store, 'data', data);
    return json(200, { success: true });
  }

  return json(405, { error: 'Méthode non autorisée' });
};
