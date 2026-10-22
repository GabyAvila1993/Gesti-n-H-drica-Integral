import { classNames } from '../../shared/ui/class-names';
import styles from './MapLegend.module.css';

const ITEMS = [
  { label: 'Canal sin anomalías', swatch: styles.mapLegendSwatchNormal, dot: false },
  { label: 'Humedad anómala · Bajo', swatch: styles.mapLegendSwatchLow, dot: true },
  { label: 'Humedad anómala · Medio', swatch: styles.mapLegendSwatchMedium, dot: true },
  { label: 'Humedad anómala · Crítico', swatch: styles.mapLegendSwatchCritical, dot: true },
];

export function MapLegend() {
  return (
    <aside className={styles.mapLegend} aria-label="Referencias del mapa">
      <p className={styles.mapLegendTitle}>Referencias (MNDWI)</p>
      {ITEMS.map((item) => (
        <span key={item.label} className={styles.mapLegendItem}>
          <span
            className={classNames(
              styles.mapLegendSwatch,
              item.dot && styles.mapLegendSwatchDot,
              item.swatch,
            )}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </aside>
  );
}
