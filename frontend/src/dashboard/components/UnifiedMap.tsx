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
                🛰️ Fuga · {leak.canalName} ({leak.municipality}) · MNDWI {leak.mndwi.toFixed(2)}
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
                🏙️ Acequia · {urban.address} ({urban.municipality}) · Obstrucción{' '}
                {urban.obstructionPercentage}%
              </Tooltip>
            </CircleMarker>
          );
        })}

        <UnifiedMapFocus selected={selectedRecord} />
      </BaseMap>

      <aside className={styles.legend} aria-label="Leyenda del mapa unificado">
        <p className={styles.legendTitle}>Capas del Mapa Unificado</p>
        <span className={styles.legendRow}>
          <span className={styles.legendLine} aria-hidden="true" />
          Traza de canal de riego
        </span>
        <span className={styles.legendRow}>
          <span className={classNames(styles.legendDot, styles.legendDotSat)} aria-hidden="true" />
          🛰️ Fuga satelital (MNDWI)
        </span>
        <span className={styles.legendRow}>
          <span
            className={classNames(styles.legendDot, styles.legendDotUrban)}
            aria-hidden="true"
          />
          🏙️ Acequia urbana obstruida (IA)
        </span>
      </aside>
    </div>
  );
}
