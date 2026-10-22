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
          ? `Backend conectado · Satélite: ${state.health.satelliteProvider} · Visión IA: ${state.health.visionProvider}`
          : state.kind === 'offline'
            ? 'Backend desconectado'
            : 'Verificando servidor…'
      }
    >
      <span className={styles.backendStatusDot} aria-hidden="true" />
      <span className={styles.backendStatusText}>
        {state.kind === 'checking' && 'Verificando…'}
        {state.kind === 'offline' && 'Desconectado'}
        {state.kind === 'online' && (
          <>
            Conectado
            <span className={styles.backendStatusProviders}>
              {' '}
              · Satélite: {state.health.satelliteProvider} · IA: {state.health.visionProvider}
            </span>
          </>
        )}
      </span>
    </div>
  );
}
