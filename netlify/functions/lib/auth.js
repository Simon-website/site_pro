'use strict';
const crypto   = require('crypto');
const { getStore } = require('@netlify/blobs');

/* ── Stores Netlify Blobs ─────────────────────────────────────────── */
function adminStore() {
  return getStore({ name: 'webcraft-admin', siteID: process.env.SITE_ID, token: process.env.NETLIFY_ACCESS_TOKEN });
}
function siteStore() {
  return getStore({ name: 'webcraft-site', siteID: process.env.SITE_ID, token: process.env.NETLIFY_ACCESS_TOKEN });
}
function messagesStore() {
  return getStore({ name: 'contact-messages', siteID: process.env.SITE_ID, token: process.env.NETLIFY_ACCESS_TOKEN });
}

async function blobGet(store, key) {
  try { return await store.get(key, { type: 'json' }); } catch { return null; }
}
async function blobSet(store, key, value) {
  await store.setJSON(key, value);
}

/* ── Config admin (mot de passe + secret JWT) ─────────────────────── */
async function getConfig() {
  let cfg = await blobGet(adminStore(), 'config');
  if (!cfg) {
    const salt      = crypto.randomBytes(16).toString('hex');
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    cfg = { salt, hash: pbkdf2('1234', salt), jwtSecret };
    await blobSet(adminStore(), 'config', cfg);
  }
  return cfg;
}
async function saveConfig(cfg) {
  await blobSet(adminStore(), 'config', cfg);
}

/* ── Hachage PBKDF2-SHA512 ────────────────────────────────────────── */
function pbkdf2(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
}

/* ── JWT minimal HS256 ────────────────────────────────────────────── */
function b64url(str) { return Buffer.from(str).toString('base64url'); }

function signToken(payload, secret) {
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const b = b64url(JSON.stringify(payload));
  const s = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${s}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
  try {
    const sBuf = Buffer.from(s, 'base64url');
    const eBuf = Buffer.from(expected, 'base64url');
    if (sBuf.length !== eBuf.length || !crypto.timingSafeEqual(sBuf, eBuf)) return null;
  } catch { return null; }
  try {
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch { return null; }
}

/* ── Cookies ──────────────────────────────────────────────────────── */
function parseCookies(header) {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map(c => {
      const i = c.indexOf('=');
      return i < 0 ? [c.trim(), ''] : [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1).trim())];
    })
  );
}
function getTokenFromEvent(event) {
  const h = event.headers?.cookie || event.headers?.Cookie || '';
  return parseCookies(h).wc_token || null;
}
function setCookieHeader(token) {
  return `wc_token=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200`;
}
function clearCookieHeader() {
  return `wc_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

/* ── Auth guard ───────────────────────────────────────────────────── */
async function requireAuth(event) {
  const token = getTokenFromEvent(event);
  if (!token) return null;
  const cfg = await getConfig();
  return verifyToken(token, cfg.jwtSecret);
}

/* ── Rate limiting via Blobs ──────────────────────────────────────── */
const MAX_TRIES = 5;
const LOCK_MS   = 15 * 60 * 1000;

function ipKey(event) {
  const ip = (event.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  return `attempts-${ip.replace(/[^a-z0-9]/gi, '-').slice(0, 60)}`;
}

async function checkLock(event) {
  const entry = await blobGet(adminStore(), ipKey(event));
  if (!entry) return null;
  if (Date.now() < entry.lockedUntil) return Math.ceil((entry.lockedUntil - Date.now()) / 60000);
  return null;
}

async function recordFail(event) {
  const key   = ipKey(event);
  const store = adminStore();
  const entry = (await blobGet(store, key)) || { count: 0, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= MAX_TRIES) { entry.lockedUntil = Date.now() + LOCK_MS; entry.count = 0; }
  await blobSet(store, key, entry);
  return Math.max(0, MAX_TRIES - entry.count);
}

async function clearLock(event) {
  try { await adminStore().delete(ipKey(event)); } catch {}
}

/* ── Réponse JSON ─────────────────────────────────────────────────── */
function json(statusCode, body, headers = {}) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) };
}

module.exports = {
  adminStore, siteStore, messagesStore, blobGet, blobSet,
  getConfig, saveConfig, pbkdf2,
  signToken, verifyToken, requireAuth,
  getTokenFromEvent, setCookieHeader, clearCookieHeader,
  checkLock, recordFail, clearLock,
  json,
};
