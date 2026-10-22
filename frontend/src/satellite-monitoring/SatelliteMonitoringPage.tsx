import { useMemo, useState } from 'react';
import type { Severity } from '../shared/domain/risk-level';
import { BaseMap } from '../shared/map/BaseMap';
import { Button } from '../shared/ui/Button/Button';
import { Card } from '../shared/ui/Card/Card';
import { EmptyState } from '../shared/ui/EmptyState/EmptyState';
import { Select, type SelectOption } from '../shared/ui/Select/Select';
import { Spinner } from '../shared/ui/Spinner/Spinner';
import { classNames } from '../shared/ui/class-names';
import { AlertList } from './components/AlertList';
import { CanalPolyline } from './components/CanalPolyline';
import { LeakDetailPanel } from './components/LeakDetailPanel';
import { LeakMarker } from './components/LeakMarker';
import { MapFocus } from './components/MapFocus';
import { MapLegend } from './components/MapLegend';
import { useSatelliteData } from './hooks/useSatelliteData';
import type { LeakAlert } from './types';
import styles from './SatelliteMonitoringPage.module.css';

const SEVERITY_OPTIONS: readonly SelectOption[] = [
  { value: 'ALL', label: 'Todas las severidades' },
  { value: 'CRITICO', label: 'Crítico' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'BAJO', label: 'Bajo' },
];

export function SatelliteMonitoringPage() {
  const { state, reload } = useSatelliteData();
  const [selected, setSelected] = useState<LeakAlert | null>(null);
  const [canalFilter, setCanalFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');

  const canalOptions = useMemo<SelectOption[]>(() => {
    if (state.status !== 'ready') return [{ value: 'ALL', label: 'Todos los canales' }];
    return [
      { value: 'ALL', label: 'Todos los canales' },
      ...state.canals.map((c) => ({ value: c.id, label: c.name })),
    ];
  }, [state]);

  const filteredAlerts = useMemo(() => {
    if (state.status !== 'ready') return [];
    return state.alerts.filter((alert) => {
      if (canalFilter !== 'ALL' && alert.canalId !== canalFilter) return false;
      if (severityFilter !== 'ALL' && alert.severity !== severityFilter) return false;
      return true;
    });
  }, [state, canalFilter, severityFilter]);

  const stats = useMemo(() => {
    if (state.status !== 'ready') return null;
    return {
      canals: state.canals.length,
      alerts: filteredAlerts.length,
      critical: filteredAlerts.filter((a) => a.severity === 'CRITICO').length,
    };
  }, [state, filteredAlerts]);

  if (state.status === 'loading') {
    return (
      <div className={styles.satellitePageCentered}>
        <Spinner label="Procesando escena satelital…" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <Card>
        <EmptyState
          tone="error"
          icon="🛰️"
          title="No se pudieron obtener los datos satelitales"
          description={state.message}
          action={<Button onClick={reload}>Reintentar</Button>}
        />
      </Card>
    );
  }

  return (
    <div className={styles.satellitePage}>
      <div className={styles.satellitePageMapWrapper}>
        <BaseMap>
          {state.canals.map((canal) => (
            <CanalPolyline
              key={canal.id}
              canal={canal}
              dimmed={
                (selected !== null && selected.canalId !== canal.id) ||
                (canalFilter !== 'ALL' && canalFilter !== canal.id)
              }
            />
          ))}
          {filteredAlerts.map((alert) => (
            <LeakMarker
              key={alert.id}
              alert={alert}
              selected={alert.id === selected?.id}
              onSelect={setSelected}
            />
          ))}
          <MapFocus alert={selected} />
        </BaseMap>
        <MapLegend />
      </div>

      <div className={styles.satellitePageAside}>
        {stats && (
          <div className={styles.satellitePageStats}>
            <div className={styles.stat}>
              <p className={styles.statValue}>{stats.canals}</p>
              <p className={styles.statLabel}>Canales auditados</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statValue}>{stats.alerts}</p>
              <p className={styles.statLabel}>Fugas visibles</p>
            </div>
            <div className={styles.stat}>
              <p className={classNames(styles.statValue, styles.statValueCritical)}>
                {stats.critical}
              </p>
              <p className={styles.statLabel}>Críticas</p>
            </div>
          </div>
        )}

        <Card title="Filtros de auditoría">
          <div className={styles.satellitePageFilters}>
            <Select
              label="Canal"
              options={canalOptions}
              value={canalFilter}
              onChange={(e) => {
                setCanalFilter(e.target.value);
                setSelected(null);
              }}
            />
            <Select
              label="Severidad"
              options={SEVERITY_OPTIONS}
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value as 'ALL' | Severity);
                setSelected(null);
              }}
            />
          </div>
        </Card>

        {selected ? (
          <Card title="Detalle de la alerta">
            <LeakDetailPanel alert={selected} onClose={() => setSelected(null)} />
          </Card>
        ) : (
          <Card title="Alertas detectadas">
            {filteredAlerts.length === 0 ? (
              <EmptyState
                icon="✅"
                title="Sin alertas para el filtro actual"
                description="No hay anomalías MNDWI que coincidan con el canal o severidad seleccionados."
              />
            ) : (
              <AlertList alerts={filteredAlerts} selectedId={null} onSelect={setSelected} />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
