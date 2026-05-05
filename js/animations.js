/* ─── Curseur personnalisé (desktop seulement) ───────────────────── */
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const dot  = document.createElement('div');
  const ring = document.createElement('div');
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let tx = -100, ty = -100;
  let rx = -100, ry = -100;

  document.addEventListener('mousemove', e => {
    tx = e.clientX;
    ty = e.clientY;
    dot.style.transform = `translate(calc(${tx}px - 50%), calc(${ty}px - 50%))`;
  });

  /* Lag fluide du ring via lerp */
  function lerp(a, b, t) { return a + (b - a) * t; }
  (function loop() {
    rx = lerp(rx, tx, 0.1);
    ry = lerp(ry, ty, 0.1);
    ring.style.transform = `translate(calc(${rx}px - 50%), calc(${ry}px - 50%))`;
    requestAnimationFrame(loop);
  })();

  /* Grossissement au survol des éléments interactifs */
  document.querySelectorAll('a, button, .service-card, .hero-card, .pf-card, .why-small-card').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
  });

  /* Disparaître hors de la fenêtre */
  document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });
}

/* ─── Hero title — word stagger ─────────────────────────────────── */
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
  let wordIndex = 0;

  function wrapWords(node, isGrad) {
    const text = node.textContent.trim();
    if (!text) return;
    const words = text.split(/\s+/);
    const frag = document.createDocumentFragment();
    words.forEach(word => {
      const outer = isGrad ? document.createElement('span') : null;
      const span = document.createElement('span');
      span.className = 'hero-word' + (isGrad ? ' grad' : '');
      span.textContent = word;
      span.style.animationDelay = `${0.18 + wordIndex * 0.11}s`;
      wordIndex++;
      if (isGrad) {
        frag.appendChild(span);
      } else {
        frag.appendChild(span);
      }
      frag.appendChild(document.createTextNode(' '));
    });
    return frag;
  }

  const gradSpan = heroTitle.querySelector('.grad');
  if (gradSpan) {
    const gradWords = gradSpan.textContent.trim().split(/\s+/);
    gradSpan.textContent = '';
    gradWords.forEach(w => {
      const s = document.createElement('span');
      s.className = 'hero-word grad';
      s.textContent = w + ' ';
      s.style.animationDelay = `${0.18 + wordIndex * 0.11}s`;
      wordIndex++;
      gradSpan.appendChild(s);
    });
  }

  heroTitle.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const words = node.textContent.trim().split(/\s+/);
      const frag = document.createDocumentFragment();
      words.forEach(w => {
        const s = document.createElement('span');
        s.className = 'hero-word';
        s.textContent = w + ' ';
        s.style.animationDelay = `${0.18 + wordIndex * 0.11}s`;
        wordIndex++;
        frag.appendChild(s);
      });
      node.replaceWith(frag);
    }
  });

  /* Décaler subtitle et actions après le dernier mot */
  const afterDelay = `${0.18 + wordIndex * 0.11 + 0.1}s`;
  document.querySelector('.hero-subtitle')?.style.setProperty('animation-delay', afterDelay);
  document.querySelector('.hero-actions')?.style.setProperty('animation-delay', `calc(${afterDelay} + 0.1s)`);
}

/* ─── Parallax — orbs hero au scroll ────────────────────────────── */
const orb1 = document.querySelector('.hero-orb-1');
const orb2 = document.querySelector('.hero-orb-2');
const orb3 = document.querySelector('.hero-orb-3');

if (orb1 || orb2) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (orb1) orb1.style.transform = `translateY(${y * 0.18}px)`;
    if (orb2) orb2.style.transform = `translateY(${y * -0.12}px)`;
    if (orb3) orb3.style.transform = `translateY(${y * 0.1}px)`;
  }, { passive: true });
}

/* ─── Reveal au scroll (IntersectionObserver) ────────────────────── */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal, .reveal-left, .reveal-right')
  .forEach(el => revealObserver.observe(el));

/* ─── Compteur animé — easing ease-out ──────────────────────────── */
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const duration = 1600;
  const startTime = performance.now();

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = target * easeOut(progress);
    el.textContent = (Number.isInteger(target) ? Math.floor(value) : value.toFixed(1)) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target + suffix;
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number[data-target]')
  .forEach(el => counterObserver.observe(el));

/* ─── Tilt magnétique sur les cartes ────────────────────────────── */
function addMagneticTilt(selector, deg = 7) {
  document.querySelectorAll(selector).forEach(card => {
    card.style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1), box-shadow 0.35s ease';

    card.addEventListener('mousemove', e => {
      const r   = card.getBoundingClientRect();
      const dx  = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
      const dy  = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
      card.style.transform =
        `perspective(900px) rotateY(${dx * deg}deg) rotateX(${-dy * deg}deg) translateY(-5px) scale(1.01)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

addMagneticTilt('.service-card', 6);
addMagneticTilt('.why-small-card', 5);
addMagneticTilt('.stat-card', 4);

/* ─── Nav — section active au scroll ────────────────────────────── */
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
if (navLinks.length) {
  const sections = [...navLinks]
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => sectionObserver.observe(s));
}
