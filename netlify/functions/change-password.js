'use strict';
const crypto = require('crypto');
const { getConfig, saveConfig, pbkdf2, requireAuth, json } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Méthode non autorisée' });

  const auth = await requireAuth(event);
  if (!auth) return json(401, { error: 'Non autorisé' });

  let currentPassword, newPassword;
  try { ({ currentPassword, newPassword } = JSON.parse(event.body || '{}')); }
  catch { return json(400, { error: 'Corps invalide' }); }

  if (!newPassword || String(newPassword).length < 8) {
    return json(400, { error: 'Le mot de passe doit faire au moins 8 caractères' });
  }

  const cfg = await getConfig();
  if (pbkdf2(currentPassword, cfg.salt) !== cfg.hash) {
    return json(401, { error: 'Mot de passe actuel incorrect' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  await saveConfig({ ...cfg, salt: newSalt, hash: pbkdf2(newPassword, newSalt) });

  return json(200, { success: true });
};
