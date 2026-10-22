import styles from './Spinner.module.css';

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <span className={styles.spinner} role="status" aria-live="polite" aria-busy="true">
      <span className={styles.spinnerCircle} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
