'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const params = new URLSearchParams(window.location.search);
if (params.get('cancelled') === '1') {
  document.getElementById('cancel-msg').style.display = 'block';
}

document.getElementById('pay-form').addEventListener('submit', async e => {
  e.preventDefault();

  const nameEl  = document.getElementById('pay-name');
  const emailEl = document.getElementById('pay-email');
  const descEl  = document.getElementById('pay-desc');
  const btn     = document.getElementById('pay-btn');
  const errEl   = document.getElementById('pay-error');

  const name  = nameEl.value.trim();
  const email = emailEl.value.trim();
  const desc  = descEl.value.trim();

  nameEl.classList.remove('error');
  emailEl.classList.remove('error');
  errEl.style.display = 'none';

  let valid = true;
  if (!name)              { nameEl.classList.add('error');  valid = false; }
  if (!EMAIL_RE.test(email)) { emailEl.classList.add('error'); valid = false; }
  if (!valid) return;

  btn.disabled    = true;
  btn.textContent = 'Redirection vers le paiement…';

  try {
    const res  = await fetch('/api/create-checkout-session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, description: desc || 'Acompte WebCraft' }),
    });
    const data = await res.json();

    if (!res.ok || !data.url) {
      throw new Error(data.error || 'Erreur serveur');
    }

    window.location.href = data.url;
  } catch (err) {
    errEl.textContent   = err.message || 'Une erreur est survenue. Réessayez.';
    errEl.style.display = 'block';
    btn.disabled        = false;
    btn.textContent     = 'Payer 0,50 € par carte →';
  }
});
