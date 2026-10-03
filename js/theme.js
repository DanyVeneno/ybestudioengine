(() => {
  const key = 'ybe-v5-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch {}

  function apply(theme) {
    root.dataset.theme = theme;
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    const dark = theme === 'dark';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
    toggle.title = dark ? 'Activar modo claro' : 'Activar modo oscuro';
    toggle.querySelector('[data-theme-icon]').textContent = dark ? '☾' : '☀';
    toggle.querySelector('[data-theme-label]').textContent = dark ? 'Oscuro' : 'Claro';
  }

  apply(preference || (system.matches ? 'dark' : 'light'));
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.getElementById('themeToggle').addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(preference);
      try { localStorage.setItem(key, preference); } catch {}
    });
  });
  system.addEventListener('change', event => {
    if (!preference) apply(event.matches ? 'dark' : 'light');
  });
})();
