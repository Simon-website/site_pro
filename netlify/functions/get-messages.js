/* ─── Netlify Function : get-messages ────────────────────────────
   Retourne les soumissions Netlify Forms pour l'admin panel.
   Variables d'environnement requises (Netlify dashboard → Site settings → Env vars) :
     ADMIN_PASSWORD_HASH  — SHA-256 du mot de passe admin
     NETLIFY_ACCESS_TOKEN — Token personnel Netlify (User settings → Personal access tokens)
   SITE_ID est injecté automatiquement par le runtime Netlify.
─────────────────────────────────────────────────────────────── */

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'x-admin-hash',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  /* ── Auth ── */
  const hash         = event.headers['x-admin-hash'];
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedHash) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'ADMIN_PASSWORD_HASH non configuré' }) };
  }
  if (!hash || hash !== expectedHash) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorisé' }) };
  }

  /* ── Récupération des soumissions via l'API Netlify ── */
  const siteId = process.env.SITE_ID;
  const token  = process.env.NETLIFY_ACCESS_TOKEN;

  if (!token) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'NETLIFY_ACCESS_TOKEN non configuré' }) };
  }

  const apiUrl = `https://api.netlify.com/api/v1/sites/${siteId}/submissions?per_page=100`;
  const res    = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return { statusCode: res.status, headers, body: JSON.stringify({ error: `API Netlify : ${text}` }) };
  }

  const submissions = await res.json();

  /* ── Normalise les champs (Netlify renvoie les données dans `data`) ── */
  const messages = submissions.map(s => ({
    id:        s.id,
    number:    s.number,
    date:      s.created_at,
    name:      s.data?.name  || s.name  || '—',
    email:     s.data?.email || s.email || '—',
    message:   s.data?.message || '—',
    site_url:  s.site_url || '',
  }));

  return { statusCode: 200, headers, body: JSON.stringify(messages) };
};
