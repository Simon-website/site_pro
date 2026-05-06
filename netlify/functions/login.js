'use strict';
const {
  getConfig, pbkdf2, signToken,
  setCookieHeader, checkLock, recordFail, clearLock,
  json,
} = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Méthode non autorisée' });

  const lockMin = await checkLock(event);
  if (lockMin) return json(429, { error: `Trop de tentatives. Réessayez dans ${lockMin} min.` });

  let password;
  try { ({ password } = JSON.parse(event.body || '{}')); } catch { return json(400, { error: 'Corps invalide' }); }
  if (!password) return json(400, { error: 'Mot de passe requis' });

  const cfg  = await getConfig();
  const hash = pbkdf2(password, cfg.salt);

  if (hash === cfg.hash) {
    await clearLock(event);
    const token = signToken(
      { sub: 'admin', exp: Math.floor(Date.now() / 1000) + 7200 },
      cfg.jwtSecret
    );
    return json(200, { success: true }, { 'Set-Cookie': setCookieHeader(token) });
  }

  const left = await recordFail(event);
  return json(401, { error: 'Mot de passe incorrect', attemptsLeft: left });
};
