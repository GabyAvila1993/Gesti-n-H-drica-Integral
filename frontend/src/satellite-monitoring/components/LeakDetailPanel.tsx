import { Button } from '../../shared/ui/Button/Button';
import { RiskBadge } from '../../shared/ui/RiskBadge/RiskBadge';
import { classNames } from '../../shared/ui/class-names';
import type { LeakAlert } from '../types';
import styles from './LeakDetailPanel.module.css';

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Mendoza',
});

interface LeakDetailPanelProps {
  alert: LeakAlert;
  onClose: () => void;
}

export function LeakDetailPanel({ alert, onClose }: LeakDetailPanelProps) {
  const [lng, lat] = alert.location.coordinates;

  return (
    <div className={styles.leakDetail}>
      <div className={styles.leakDetailHeader}>
        <div>
          <p className={styles.leakDetailCanal}>{alert.canalName}</p>
          <p className={styles.leakDetailMunicipality}>{alert.municipality}</p>
        </div>
        <RiskBadge level={alert.severity} />
      </div>

      <dl className={styles.leakDetailGrid}>
        <div className={styles.leakDetailField}>
          <dt className={styles.leakDetailLabel}>Nivel de humedad</dt>
          <dd className={styles.leakDetailValue}>{alert.mndwi.toFixed(2)}</dd>
        </div>
        <div className={styles.leakDetailField}>
          <dt className={styles.leakDetailLabel}>Fecha</dt>
          <dd className={styles.leakDetailValue}>{dateFormatter.format(new Date(alert.detectedAt))}</dd>
        </div>
        <div className={styles.leakDetailField}>
          <dt className={styles.leakDetailLabel}>Ubicación</dt>
          <dd className={classNames(styles.leakDetailValue, styles.leakDetailValueMono)}>
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </dd>
        </div>
        <div className={styles.leakDetailField}>
          <dt className={styles.leakDetailLabel}>Registro</dt>
          <dd className={classNames(styles.leakDetailValue, styles.leakDetailValueMono)}>
            {alert.id}
          </dd>
        </div>
      </dl>

      <p className={styles.leakDetailHint}>
        Se detectó humedad fuera del cauce. Se recomienda enviar personal a revisar posibles
        filtraciones o roturas en los márgenes del canal.
      </p>

      <Button variant="secondary" onClick={onClose}>
        Cerrar detalle
      </Button>
    </div>
  );
}
