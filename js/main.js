/* ─── Page loader ────────────────────────────────────────────────── */
window.addEventListener('load', () => {
  const loader = document.getElementById('page-loader');
  if (loader) setTimeout(() => loader.classList.add('hidden'), 250);
});

/* ─── Header scroll ──────────────────────────────────────────────── */
const header    = document.querySelector('header');
const hamburger  = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ─── Smooth scroll ancres avec offset header ────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (!href || href === '#') { e.preventDefault(); return; }
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    hamburger?.classList.remove('open');
    mobileMenu?.classList.remove('open');
    document.body.style.overflow = '';
  });
});

/* ─── Menu hamburger ─────────────────────────────────────────────── */

hamburger?.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

/* ─── Tilt 3D sur les hero cards (mousemove sur le conteneur) ────── */
document.querySelectorAll('.hero-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r  = card.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    card.style.transform =
      `perspective(800px) rotateY(${dx * 5}deg) rotateX(${-dy * 5}deg) translateY(-6px) scale(1.02)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* ─── Formulaire de contact ──────────────────────────────────────── */
const form = document.getElementById('contact-form');

form?.addEventListener('submit', e => {
  e.preventDefault();
  let valid = true;

  form.querySelectorAll('[required]').forEach(field => {
    const err = field.nextElementSibling;
    const empty = !field.value.trim();
    const badEmail = field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);

    field.classList.toggle('error', empty || badEmail);
    if (err?.classList.contains('form-error')) {
      err.style.display = (empty || badEmail) ? 'block' : 'none';
      if (empty)    err.textContent = 'Ce champ est requis.';
      if (badEmail) err.textContent = 'Adresse email invalide.';
    }
    if (empty || badEmail) valid = false;
  });

  if (valid) {
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.value, email: form.email.value, message: form.message.value }),
    })
      .finally(() => {
        form.style.display = 'none';
        document.querySelector('.form-success').style.display = 'block';
      });
  }
});

form?.querySelectorAll('input, textarea').forEach(field => {
  field.addEventListener('input', () => {
    field.classList.remove('error');
    const err = field.nextElementSibling;
    if (err?.classList.contains('form-error')) err.style.display = 'none';
  });
});
