import { Polyline, Tooltip } from 'react-leaflet';
import type { RiskLevel } from '../../shared/domain/risk-level';
import { classNames } from '../../shared/ui/class-names';
import { toLatLng, type Canal } from '../types';
import styles from './map-layers.module.css';

const STATUS_CLASS: Record<RiskLevel, string> = {
  NORMAL: styles.canalLineNormal,
  BAJO: styles.canalLineLow,
  MEDIO: styles.canalLineMedium,
  CRITICO: styles.canalLineCritical,
};

interface CanalPolylineProps {
  canal: Canal;
  dimmed?: boolean;
}

export function CanalPolyline({ canal, dimmed = false }: CanalPolylineProps) {
  const className = classNames(
    styles.canalLine,
    STATUS_CLASS[canal.status],
    dimmed && styles.canalLineDimmed,
  );

  return (
    // Leaflet no actualiza className tras el montaje: la key fuerza el re-render al cambiar el estado.
    <Polyline
      key={className}
      positions={canal.geometry.coordinates.map(toLatLng)}
      pathOptions={{ className }}
    >
      <Tooltip sticky className={styles.mapTooltip}>
        {canal.name} · {canal.nominalFlowM3s} m³/s
      </Tooltip>
    </Polyline>
  );
}
