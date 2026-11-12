(() => {
  const KEY = 'starting-five-theme';
  const root = document.documentElement;
  const label = t => t === 'neon' ? '☀ 米白主题' : '✦ 霓虹主题';
  const apply = t => {
    root.dataset.theme = t;
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.textContent = label(t);
      button.setAttribute('aria-pressed', String(t === 'neon'));
    });
  };
  let saved = 'classic';
  try { saved = localStorage.getItem(KEY) || root.dataset.theme || 'classic'; } catch {}
  apply(saved);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-theme-toggle]');
    if (!button) return;
    const next = root.dataset.theme === 'neon' ? 'classic' : 'neon';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch {}
  });
})();
