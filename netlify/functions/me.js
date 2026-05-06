'use strict';
const { requireAuth, json } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  const payload = await requireAuth(event);
  return json(200, { authenticated: !!payload });
};
