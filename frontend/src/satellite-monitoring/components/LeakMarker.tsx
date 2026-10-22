import { CircleMarker, Tooltip } from 'react-leaflet';
import type { Severity } from '../../shared/domain/risk-level';
import { classNames } from '../../shared/ui/class-names';
import { toLatLng, type LeakAlert } from '../types';
import styles from './map-layers.module.css';

const SEVERITY_CLASS: Record<Severity, string> = {
  BAJO: styles.leakMarkerLow,
  MEDIO: styles.leakMarkerMedium,
  CRITICO: styles.leakMarkerCritical,
};

const SEVERITY_RADIUS: Record<Severity, number> = { BAJO: 8, MEDIO: 10, CRITICO: 12 };

interface LeakMarkerProps {
  alert: LeakAlert;
  selected: boolean;
  onSelect: (alert: LeakAlert) => void;
}

export function LeakMarker({ alert, selected, onSelect }: LeakMarkerProps) {
  const className = classNames(
    styles.leakMarker,
    SEVERITY_CLASS[alert.severity],
    selected && styles.leakMarkerSelected,
  );

  return (
    <CircleMarker
      key={className}
      center={toLatLng(alert.location.coordinates)}
      radius={SEVERITY_RADIUS[alert.severity] + (selected ? 3 : 0)}
      pathOptions={{ className }}
      eventHandlers={{ click: () => onSelect(alert) }}
    >
      <Tooltip direction="top" offset={[0, -8]} className={styles.mapTooltip}>
        Fuga potencial · MNDWI {alert.mndwi.toFixed(2)}
      </Tooltip>
    </CircleMarker>
  );
}
