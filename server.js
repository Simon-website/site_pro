'use strict';
const express = require('express');
const session = require('express-session');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');

const app      = express();
const PORT     = process.env.PORT || 3000;
const ROOT     = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const CONFIG_F = path.join(DATA_DIR, 'config.json');
const DATA_F   = path.join(DATA_DIR, 'site_data.json');
const MSGS_F   = path.join(DATA_DIR, 'messages.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

/* ── Config (hash mot de passe + secret session) ─────────────────── */
function pbkdf2(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
}

function loadConfig() {
  if (fs.existsSync(CONFIG_F)) return JSON.parse(fs.readFileSync(CONFIG_F, 'utf8'));
  const salt          = crypto.randomBytes(16).toString('hex');
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const cfg           = { salt, hash: pbkdf2('1234', salt), sessionSecret };
  fs.writeFileSync(CONFIG_F, JSON.stringify(cfg, null, 2));
  console.log('\n  Première initialisation — mot de passe par défaut : 1234\n');
  return cfg;
}

const cfg = loadConfig();

/* ── Middleware ───────────────────────────────────────────────────── */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.set('trust proxy', 1);

app.use(session({
  secret:            cfg.sessionSecret,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   2 * 60 * 60 * 1000,
  },
}));

/* ── Limitation de tentatives de connexion ───────────────────────── */
const loginAttempts = new Map();  // ip → { count, lockedUntil }
const MAX_TRIES = 5;
const LOCK_MS   = 15 * 60 * 1000;

function checkLock(ip) {
  const e = loginAttempts.get(ip);
  if (!e || Date.now() >= e.lockedUntil) return null;
  return Math.ceil((e.lockedUntil - Date.now()) / 60000);
}
function recordFail(ip) {
  const e = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  e.count++;
  if (e.count >= MAX_TRIES) { e.lockedUntil = Date.now() + LOCK_MS; e.count = 0; }
  loginAttempts.set(ip, e);
  return Math.max(0, MAX_TRIES - (loginAttempts.get(ip)?.count || 0));
}
function clearLock(ip) { loginAttempts.delete(ip); }

/* ── Guards ──────────────────────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (req.session?.authenticated) return next();
  res.status(401).json({ error: 'Non autorisé' });
}
function requireAuthPage(req, res, next) {
  if (req.session?.authenticated) return next();
  res.redirect('/admin/index.html');
}

/* ═══════════════════════════════════════════════════════════════════
   Routes API
═══════════════════════════════════════════════════════════════════ */

/* Connexion */
app.post('/api/login', (req, res) => {
  const ip      = req.ip;
  const lockMin = checkLock(ip);
  if (lockMin) return res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${lockMin} min.` });

  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Mot de passe requis' });

  const current = JSON.parse(fs.readFileSync(CONFIG_F, 'utf8'));
  if (pbkdf2(password, current.salt) === current.hash) {
    clearLock(ip);
    req.session.authenticated = true;
    return res.json({ success: true });
  }

  const left = recordFail(ip);
  res.status(401).json({ error: 'Mot de passe incorrect', attemptsLeft: left });
});

/* Déconnexion */
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.clearCookie('connect.sid').json({ success: true }));
});

/* Vérification de session */
app.get('/api/me', (req, res) => {
  res.json({ authenticated: !!req.session?.authenticated });
});

/* Données du site — lecture publique, écriture protégée */
app.get('/api/site-data', (req, res) => {
  if (!fs.existsSync(DATA_F)) return res.json(null);
  res.json(JSON.parse(fs.readFileSync(DATA_F, 'utf8')));
});

app.post('/api/site-data', requireAuth, (req, res) => {
  fs.writeFileSync(DATA_F, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

/* Messages de contact */
app.get('/api/messages', requireAuth, (req, res) => {
  if (!fs.existsSync(MSGS_F)) return res.json([]);
  res.json(JSON.parse(fs.readFileSync(MSGS_F, 'utf8')));
});

app.post('/api/contact', (req, res) => {
  const name    = String(req.body.name    || '').trim();
  const email   = String(req.body.email   || '').trim();
  const message = String(req.body.message || '').trim();
  if (!name || !email || !message) return res.status(400).json({ error: 'Tous les champs sont requis' });

  const msgs = fs.existsSync(MSGS_F) ? JSON.parse(fs.readFileSync(MSGS_F, 'utf8')) : [];
  msgs.unshift({
    id:      `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    number:  msgs.length + 1,
    name, email, message,
    date: new Date().toISOString(),
  });
  fs.writeFileSync(MSGS_F, JSON.stringify(msgs, null, 2));
  res.json({ success: true });
});

/* Changement de mot de passe */
app.post('/api/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
  }
  const current = JSON.parse(fs.readFileSync(CONFIG_F, 'utf8'));
  if (pbkdf2(currentPassword, current.salt) !== current.hash) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }
  const newSalt = crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(CONFIG_F, JSON.stringify(
    { ...current, salt: newSalt, hash: pbkdf2(newPassword, newSalt) }, null, 2
  ));
  res.json({ success: true });
});

/* ── Protection serveur du dashboard admin ───────────────────────── */
app.get('/admin/dashboard.html', requireAuthPage, (_req, _res, next) => next());

/* ── Fichiers statiques ───────────────────────────────────────────── */
app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log(`\n  WebCraft  →  http://localhost:${PORT}`);
  console.log(`  Admin     →  http://localhost:${PORT}/admin/index.html\n`);
});
