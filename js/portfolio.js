/* ─── Filtres portfolio ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      /* querySelectorAll à chaque clic pour prendre en compte les cards
         injectées par preview.js après un update admin */
      document.querySelectorAll('.pf-card').forEach(card => {
        card.style.display = (filter === 'all' || card.dataset.category === filter) ? '' : 'none';
      });
    });
  });
});
