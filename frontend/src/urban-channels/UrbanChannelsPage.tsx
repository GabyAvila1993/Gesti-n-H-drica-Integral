import { useMemo, useState } from 'react';
import { appConfig } from '../app.config';
import { Button } from '../shared/ui/Button/Button';
import { Card } from '../shared/ui/Card/Card';
import { EmptyState } from '../shared/ui/EmptyState/EmptyState';
import { RiskBadge } from '../shared/ui/RiskBadge/RiskBadge';
import { Select, type SelectOption } from '../shared/ui/Select/Select';
import { Spinner } from '../shared/ui/Spinner/Spinner';
import { DetectionViewer } from './components/DetectionViewer';
import { ImageDropzone } from './components/ImageDropzone';
import { RiskPanel } from './components/RiskPanel';
import { useImageAnalysis } from './hooks/useImageAnalysis';
import type { SamplePhotoPreset } from './services/sample-photos';
import styles from './UrbanChannelsPage.module.css';

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Mendoza',
});

const FILTER_OPTIONS: readonly SelectOption[] = [
  { value: 'ALL', label: 'Todos los municipios' },
  ...appConfig.municipalities.map((m) => ({ value: m, label: m })),
];

export function UrbanChannelsPage() {
  const {
    previewUrl,
    analysis,
    registration,
    alerts,
    alertsLoading,
    alertsError,
    analyzeFile,
    registerAlert,
    reloadAlerts,
    reset,
  } = useImageAnalysis();

  const [activeDetectionId, setActiveDetectionId] = useState<string | null>(null);
  const [municipalityFilter, setMunicipalityFilter] = useState<string>('ALL');

  const handleSelectFile = (file: File, preset?: SamplePhotoPreset) => {
    setActiveDetectionId(null);
    void analyzeFile(file, preset?.id);
  };

  const filteredAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) => municipalityFilter === 'ALL' || alert.municipality === municipalityFilter,
      ),
    [alerts, municipalityFilter],
  );

  return (
    <div className={styles.urbanPage}>
      <div className={styles.urbanPageWorkspace}>
        <Card
          title="Análisis de acequia por foto"
          actions={
            analysis.kind === 'ready' ? (
              <Button variant="ghost" onClick={reset}>
                Cambiar imagen
              </Button>
            ) : undefined
          }
        >
          {analysis.kind === 'idle' && <ImageDropzone onSelectFile={handleSelectFile} />}

          {analysis.kind === 'analyzing' && (
            <div className={styles.urbanPageLoading}>
              <Spinner label={`Analizando "${analysis.fileName}"…`} />
            </div>
          )}

          {analysis.kind === 'error' && (
            <EmptyState
              tone="error"
              icon="⚠️"
              title="No se pudo analizar la foto"
              description={analysis.message}
              action={<Button onClick={reset}>Probar con otra imagen</Button>}
            />
          )}

          {analysis.kind === 'ready' && previewUrl && (
            <DetectionViewer
              imageUrl={previewUrl}
              fileName={analysis.result.fileName}
              detections={analysis.result.detections}
              activeDetectionId={activeDetectionId}
              onHoverDetection={setActiveDetectionId}
            />
          )}
        </Card>

        <Card title="Estado de obstrucción y registro">
          {analysis.kind === 'ready' ? (
            <RiskPanel
              result={analysis.result}
              activeDetectionId={activeDetectionId}
              onHoverDetection={setActiveDetectionId}
              registration={registration}
              onRegisterAlert={(input) => void registerAlert(input)}
              onNewAnalysis={reset}
            />
          ) : (
            <EmptyState
              icon="🔍"
              title="Subí una foto para evaluar la acequia"
              description="Se identificarán botellas, bolsas, ramas y escombros en el cauce para estimar el porcentaje de obstrucción y registrar la alerta."
            />
          )}
        </Card>
      </div>

      <Card
        title={`Alertas de acequias registradas (${filteredAlerts.length})`}
        actions={
          <Select
            aria-label="Filtrar alertas por municipio"
            options={FILTER_OPTIONS}
            value={municipalityFilter}
            onChange={(e) => setMunicipalityFilter(e.target.value)}
          />
        }
      >
        {alertsLoading ? (
          <Spinner label="Cargando alertas registradas…" />
        ) : alertsError ? (
          <EmptyState
            tone="error"
            icon="⚠️"
            title="No se pudieron cargar las alertas"
            description={alertsError}
            action={<Button onClick={reloadAlerts}>Reintentar</Button>}
          />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon="✅"
            title="Sin alertas en este municipio"
            description="No hay acequias con obstrucción registrada para el filtro seleccionado."
          />
        ) : (
          <div className={styles.alertsGrid}>
            {filteredAlerts.map((alert) => (
              <article key={alert.id} className={styles.alertItem}>
                <div className={styles.alertItemTop}>
                  <div>
                    <p className={styles.alertItemAddress}>{alert.address}</p>
                    <p className={styles.alertItemMunicipality}>{alert.municipality}</p>
                  </div>
                  <RiskBadge level={alert.riskLevel} />
                </div>

                <div className={styles.alertItemMeta}>
                  <span>Obstrucción: {alert.obstructionPercentage}%</span>
                  <span>Materiales: {alert.detectionsCount}</span>
                  <span>{dateFormatter.format(new Date(alert.createdAt))}</span>
                </div>

                {alert.notes && <p className={styles.alertItemNotes}>“{alert.notes}”</p>}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
