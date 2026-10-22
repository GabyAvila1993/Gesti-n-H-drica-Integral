/** Registra el Service Worker para habilitar la instalación como PWA y caché de cáscara. */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Fallo silencioso en entornos que no admitan SW
    });
  });
}
