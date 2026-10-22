import { useEffect, useState } from 'react';
import styles from './PwaInstallButton.module.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Botón de acceso directo en el header para descargar/instalar la PWA en el celular o escritorio.
 * Si el navegador soporta `beforeinstallprompt`, lanza el diálogo nativo; de lo contrario,
 * muestra los pasos directos para agregarla a la pantalla de inicio.
 */
export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowHelp(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return;
    }
    setShowHelp((prev) => !prev);
  };

  return (
    <div className={styles.pwaInstall}>
      <button
        type="button"
        className={styles.pwaInstallButton}
        onClick={() => void handleInstallClick()}
        title="Instalar aplicación en tu dispositivo"
        aria-expanded={showHelp}
      >
        <span aria-hidden="true">📲</span>
        <span className={styles.pwaInstallLabel}>Instalar App</span>
      </button>

      {showHelp && (
        <div className={styles.pwaInstallPopover} role="dialog" aria-label="Instalar aplicación">
          <p className={styles.pwaInstallTitle}>Agregar a pantalla de inicio</p>
          <ul className={styles.pwaInstallSteps}>
            <li>
              <strong>Android (Chrome):</strong> tocá el menú <strong>⋮</strong> y elegí{' '}
              <em>&ldquo;Instalar aplicación&rdquo;</em>.
            </li>
            <li>
              <strong>iPhone (Safari):</strong> tocá <strong>Compartir</strong> y luego{' '}
              <em>&ldquo;Agregar a inicio&rdquo;</em>.
            </li>
            <li>
              <strong>PC / Notebook:</strong> hacé clic en el ícono de instalación en la barra de
              direcciones.
            </li>
          </ul>
          <button
            type="button"
            className={styles.pwaInstallClose}
            onClick={() => setShowHelp(false)}
          >
            Entendido
          </button>
        </div>
      )}
    </div>
  );
}
