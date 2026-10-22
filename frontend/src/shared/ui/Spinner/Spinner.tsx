import styles from './Spinner.module.css';

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <span className={styles.spinner} role="status">
      <span className={styles.spinnerCircle} aria-hidden="true" />
      {label}
    </span>
  );
}
