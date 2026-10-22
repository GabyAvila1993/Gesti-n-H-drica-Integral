import { useMemo, useState } from 'react';
import type { Municipality } from '../app.config';
import type { Severity } from '../shared/domain/risk-level';
import { Button } from '../shared/ui/Button/Button';
import { Card } from '../shared/ui/Card/Card';
import { EmptyState } from '../shared/ui/EmptyState/EmptyState';
import { Spinner } from '../shared/ui/Spinner/Spinner';
import { IncidentDetailCard } from './components/IncidentDetailCard';
import { MetricCard } from './components/MetricCard';
import { MunicipalityFilter } from './components/MunicipalityFilter';
import { RecordsTable } from './components/RecordsTable';
import { UnifiedMap } from './components/UnifiedMap';
import { useDashboard } from './hooks/useDashboard';
import type { IncidentSource, UnifiedIncidentRecord } from './types';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const [municipality, setMunicipality] = useState<Municipality | 'ALL'>('ALL');
  const [source, setSource] = useState<IncidentSource | 'ALL'>('ALL');
  const [severity, setSeverity] = useState<Severity | 'ALL'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<UnifiedIncidentRecord | null>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);

  const filterParams = useMemo(
    () => ({
      municipality: municipality === 'ALL' ? undefined : municipality,
      source: source === 'ALL' ? undefined : source,
      severity: severity === 'ALL' ? undefined : severity,
    }),
    [municipality, source, severity],
  );

  const { state, reload } = useDashboard(filterParams);

  const handleSelectRecord = (record: UnifiedIncidentRecord) => {
    setSelectedRecord(record);
    setFocusTrigger((n) => n + 1);
  };

  return (
    <div className={styles.dashboardPage}>
      <MunicipalityFilter
        municipality={municipality}
        source={source}
        severity={severity}
        onMunicipalityChange={(val) => {
          setMunicipality(val);
          setSelectedRecord(null);
        }}
        onSourceChange={(val) => {
          setSource(val);
          setSelectedRecord(null);
        }}
        onSeverityChange={(val) => {
          setSeverity(val);
          setSelectedRecord(null);
        }}
      />

      {state.status === 'loading' && (
        <div className={styles.dashboardPageCentered}>
          <Spinner label="Consolidando indicadores satelitales y urbanos…" />
        </div>
      )}

      {state.status === 'error' && (
        <Card>
          <EmptyState
            tone="error"
            icon="📊"
            title="No se pudo cargar el panel central"
            description={state.message}
            action={<Button onClick={reload}>Reintentar</Button>}
          />
        </Card>
      )}

      {state.status === 'ready' && (
        <>
          <section className={styles.dashboardPageKpis} aria-label="Indicadores clave">
            <MetricCard
              label="Fugas Satelitales Detectadas"
              value={state.metrics.satelliteLeaksDetected}
              subtitle={`${state.metrics.satelliteLeaksCritical} en nivel crítico · ${state.metrics.canalsMonitored} canales auditados`}
              icon="🛰️"
              tone={state.metrics.satelliteLeaksCritical > 0 ? 'critical' : 'info'}
            />
            <MetricCard
              label="Acequias en Riesgo Crítico"
              value={state.metrics.urbanAlertsCritical}
              subtitle={`${state.metrics.urbanAlertsTotal} alertas urbanas registradas esta semana`}
              icon="🏙️"
              tone={state.metrics.urbanAlertsCritical > 0 ? 'critical' : 'warning'}
            />
            <MetricCard
              label="Obstrucción Urbana Promedio"
              value={`${state.metrics.averageUrbanObstructionPct}%`}
              subtitle="Promedio de sección ocupada en cauces inspeccionados"
              icon="🌊"
              tone={state.metrics.averageUrbanObstructionPct >= 25 ? 'warning' : 'low'}
            />
            <MetricCard
              label="Incidentes Críticos Totales"
              value={state.metrics.criticalIncidentsTotal}
              subtitle="Prioridad inmediata para cuadrillas de Irrigación y municipios"
              icon="🚨"
              tone={state.metrics.criticalIncidentsTotal > 0 ? 'critical' : 'low'}
            />
          </section>

          <div className={styles.dashboardPageMiddle}>
            <UnifiedMap
              overview={state.mapOverview}
              records={state.records}
              selectedRecord={selectedRecord ?? state.records[0] ?? null}
              onSelectRecord={handleSelectRecord}
            />

            <Card title="Inspección del incidente seleccionado">
              {selectedRecord ?? state.records[0] ? (
                <IncidentDetailCard
                  record={(selectedRecord ?? state.records[0])!}
                  focusTrigger={focusTrigger}
                  onClose={() => setSelectedRecord(null)}
                />
              ) : (
                <EmptyState
                  icon="🗺️"
                  title="Seleccioná un incidente"
                  description="Hacé clic en un marcador del mapa o en el botón 'Ver detalle' de la tabla inferior."
                />
              )}
            </Card>
          </div>

          <Card
            title={`Listado unificado de incidentes (${state.records.length})`}
            actions={
              <Button variant="ghost" onClick={reload}>
                Actualizar datos
              </Button>
            }
          >
            {state.records.length === 0 ? (
              <EmptyState
                icon="✅"
                title="Sin incidentes para los filtros aplicados"
                description="Probá cambiando el municipio, origen o nivel de severidad."
              />
            ) : (
              <RecordsTable
                records={state.records}
                selectedId={(selectedRecord ?? state.records[0])?.id ?? null}
                onSelectRecord={handleSelectRecord}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
