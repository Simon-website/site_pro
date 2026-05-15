/* Header scroll */
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* Hamburger */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

hamburger.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});

mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});

/* Smooth scroll */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* Reveal on scroll */
const obs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

/* Highlight today */
const today = new Date().getDay();
const row = document.querySelector(`.hours-row[data-day="${today}"]`);
if (row) row.classList.add('today');

/* Accordion */
document.querySelectorAll('.acc-section.open').forEach(section => {
  const body = section.querySelector('.acc-body');
  const items = section.querySelector('.acc-items');
  if (body && items) body.style.maxHeight = items.offsetHeight + 'px';
});

document.querySelectorAll('.acc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.closest('.acc-section');
    const body = section.querySelector('.acc-body');
    const items = section.querySelector('.acc-items');
    const isOpen = section.classList.contains('open');
    if (isOpen) {
      section.classList.remove('open');
      body.style.maxHeight = '0';
      btn.setAttribute('aria-expanded', 'false');
    } else {
      section.classList.add('open');
      body.style.maxHeight = items.offsetHeight + 'px';
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});
