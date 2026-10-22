import { RiskBadge } from '../../shared/ui/RiskBadge/RiskBadge';
import { classNames } from '../../shared/ui/class-names';
import type { LeakAlert } from '../types';
import styles from './AlertList.module.css';

interface AlertListProps {
  alerts: LeakAlert[];
  selectedId: string | null;
  onSelect: (alert: LeakAlert) => void;
}

export function AlertList({ alerts, selectedId, onSelect }: AlertListProps) {
  return (
    <ul className={styles.alertList}>
      {alerts.map((alert) => (
        <li key={alert.id}>
          <button
            type="button"
            className={classNames(
              styles.alertListItem,
              alert.id === selectedId && styles.alertListItemSelected,
            )}
            aria-pressed={alert.id === selectedId}
            onClick={() => onSelect(alert)}
          >
            <span>
              <span className={styles.alertListCanal}>{alert.canalName}</span>
              <br />
              <span className={styles.alertListMeta}>
                {alert.municipality} · MNDWI {alert.mndwi.toFixed(2)}
              </span>
            </span>
            <RiskBadge level={alert.severity} />
          </button>
        </li>
      ))}
    </ul>
  );
}
