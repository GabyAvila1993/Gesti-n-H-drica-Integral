import { useBackendHealth } from '../../shared/api/use-backend-health';
import { classNames } from '../../shared/ui/class-names';
import styles from './BackendStatus.module.css';

export function BackendStatus() {
  const state = useBackendHealth();

  return (
    <div
      className={classNames(
        styles.backendStatus,
        state.kind === 'online' && styles.backendStatusOnline,
        state.kind === 'offline' && styles.backendStatusOffline,
      )}
      role="status"
      aria-live="polite"
      title={
        state.kind === 'online'
          ? 'Sistema operativo y conectado al servidor'
          : state.kind === 'offline'
            ? 'Sin conexión con el servidor'
            : 'Verificando estado del servidor…'
      }
    >
      <span className={styles.backendStatusDot} aria-hidden="true" />
      <span className={styles.backendStatusText}>
        {state.kind === 'checking' && 'Verificando…'}
        {state.kind === 'offline' && 'Sin conexión'}
        {state.kind === 'online' && 'Sistema en línea'}
      </span>
    </div>
  );
}
