// Restore before styles paint to avoid flashing the light palette on reload.
(() => {
  try {
    const saved = localStorage.getItem('passpoint-theme');
    document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
  } catch {
    // Storage can be unavailable; keep the default light theme.
  }
})();
