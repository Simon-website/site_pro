'use strict';
const { clearCookieHeader, json } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Méthode non autorisée' });
  return json(200, { success: true }, { 'Set-Cookie': clearCookieHeader() });
};
