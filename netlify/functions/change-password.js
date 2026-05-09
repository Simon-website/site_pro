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

  if (!currentPassword) return json(400, { error: 'Mot de passe actuel requis' });
  if (!newPassword || String(newPassword).length < 8) {
    return json(400, { error: 'Le nouveau mot de passe doit faire au moins 8 caractères' });
  }

  const cfg = await getConfig();
  let inputHash;
  try { inputHash = pbkdf2(String(currentPassword), cfg.salt); }
  catch { return json(500, { error: 'Erreur interne de vérification' }); }

  const inputBuf = Buffer.from(inputHash,  'hex');
  const cfgBuf   = Buffer.from(cfg.hash,   'hex');
  const match = inputBuf.length === cfgBuf.length && crypto.timingSafeEqual(inputBuf, cfgBuf);
  if (!match) {
    return json(401, { error: 'Mot de passe actuel incorrect' });
  }

  const newSalt      = crypto.randomBytes(16).toString('hex');
  const newJwtSecret = crypto.randomBytes(32).toString('hex');
  try {
    await saveConfig({ salt: newSalt, hash: pbkdf2(String(newPassword), newSalt), jwtSecret: newJwtSecret });
  } catch (e) {
    console.error('[change-password] saveConfig failed:', e?.message);
    return json(500, { error: 'Erreur lors de la sauvegarde du mot de passe' });
  }

  return json(200, { success: true });
};
