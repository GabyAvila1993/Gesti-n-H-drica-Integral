import { useEffect } from 'react';
import { CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { CanalPolyline } from '../../satellite-monitoring/components/CanalPolyline';
import { toLatLng } from '../../satellite-monitoring/types';
import type { Severity } from '../../shared/domain/risk-level';
import { BaseMap } from '../../shared/map/BaseMap';
import { classNames } from '../../shared/ui/class-names';
import type { DashboardMapOverview, UnifiedIncidentRecord } from '../types';
import styles from './UnifiedMap.module.css';

const SEVERITY_CLASS: Record<Severity, string> = {
  BAJO: styles.pinLow,
  MEDIO: styles.pinMedium,
  CRITICO: styles.pinCritical,
};

function UnifiedMapFocus({ selected }: { selected: UnifiedIncidentRecord | null }) {
  const map = useMap();

  useEffect(() => {
    if (!selected) return;
    map.flyTo(toLatLng(selected.location.coordinates), Math.max(map.getZoom(), 14), {
      duration: 0.75,
    });
  }, [selected, map]);

  return null;
}

interface UnifiedMapProps {
  overview: DashboardMapOverview;
  records: UnifiedIncidentRecord[];
  selectedRecord: UnifiedIncidentRecord | null;
  onSelectRecord: (record: UnifiedIncidentRecord) => void;
}

export function UnifiedMap({
  overview,
  records,
  selectedRecord,
  onSelectRecord,
}: UnifiedMapProps) {
  const handleSelectById = (recordId: string) => {
    const found = records.find((r) => r.id === recordId);
    if (found) onSelectRecord(found);
  };

  return (
    <div className={styles.unifiedMap}>
      <BaseMap>
        {overview.canals.map((canal) => (
          <CanalPolyline key={canal.id} canal={canal} />
        ))}

        {overview.satelliteAlerts.map((leak) => {
          const recId = `sat-${leak.id}`;
          const isSelected = selectedRecord?.id === recId;
          const className = classNames(
            styles.satPin,
            SEVERITY_CLASS[leak.severity],
            isSelected && styles.pinSelected,
          );

          return (
            <CircleMarker
              key={className + recId}
              center={toLatLng(leak.location.coordinates)}
              radius={isSelected ? 13 : 10}
              pathOptions={{ className }}
              eventHandlers={{ click: () => handleSelectById(recId) }}
            >
              <Tooltip direction="top" offset={[0, -8]} className={styles.pinTooltip}>
                📡 Sensor de Telemetría (DGI) · Alerta de desborde/filtración — {leak.canalName} (
                {leak.municipality})
              </Tooltip>
            </CircleMarker>
          );
        })}

        {overview.urbanAlerts.map((urban) => {
          const isSelected = selectedRecord?.id === urban.id;
          const className = classNames(
            styles.urbanPin,
            SEVERITY_CLASS[urban.riskLevel],
            isSelected && styles.pinSelected,
          );

          return (
            <CircleMarker
              key={className + urban.id}
              center={toLatLng(urban.location.coordinates)}
              radius={isSelected ? 13 : 10}
              pathOptions={{ className }}
              eventHandlers={{ click: () => handleSelectById(urban.id) }}
            >
              <Tooltip direction="top" offset={[0, -8]} className={styles.pinTooltip}>
                🚧 Obstrucción en vía pública · {urban.address} ({urban.municipality}) ·{' '}
                {urban.obstructionPercentage}%
              </Tooltip>
            </CircleMarker>
          );
        })}

        <UnifiedMapFocus selected={selectedRecord} />
      </BaseMap>

      <aside className={styles.legend} aria-label="Referencias del mapa">
        <p className={styles.legendTitle}>Referencias GIS · Red DGI</p>
        <span className={styles.legendRow}>
          <span
            className={classNames(styles.legendLine, styles.legendLineCritical)}
            aria-hidden="true"
          />
          Traza hídrica principal (Riesgo crítico)
        </span>
        <span className={styles.legendRow}>
          <span
            className={classNames(styles.legendLine, styles.legendLineWarning)}
            aria-hidden="true"
          />
          Cauce en advertencia / Vigilancia DGI
        </span>
        <span className={styles.legendRow}>
          <span
            className={classNames(styles.legendLine, styles.legendLineNormal)}
            aria-hidden="true"
          />
          Red de riego DGI (Flujo nominal)
        </span>
        <span className={styles.legendRow}>
          <span className={classNames(styles.legendDot, styles.legendDotSat)} aria-hidden="true" />
          Sensor de Telemetría (DGI) · Alerta de desborde/filtración
        </span>
        <span className={styles.legendRow}>
          <span
            className={classNames(styles.legendDot, styles.legendDotUrban)}
            aria-hidden="true"
          />
          Obstrucción en vía pública
        </span>
      </aside>
    </div>
  );
}
