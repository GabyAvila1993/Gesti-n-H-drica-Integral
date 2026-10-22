import { classNames } from '../../shared/ui/class-names';
import styles from './MapLegend.module.css';

const ITEMS = [
  { label: 'Traza hídrica principal (Crítico · DGI)', swatch: styles.mapLegendSwatchCritical, dot: false },
  { label: 'Cauce en advertencia (Vigilancia DGI)', swatch: styles.mapLegendSwatchMedium, dot: false },
  { label: 'Red de riego DGI (Flujo nominal)', swatch: styles.mapLegendSwatchNormal, dot: false },
  { label: 'Sensor de Telemetría (DGI) · Alerta de desborde/filtración', swatch: styles.mapLegendSwatchCritical, dot: true },
];

export function MapLegend() {
  return (
    <aside className={styles.mapLegend} aria-label="Referencias del mapa">
      <p className={styles.mapLegendTitle}>Referencias GIS · Telemetría DGI</p>
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
