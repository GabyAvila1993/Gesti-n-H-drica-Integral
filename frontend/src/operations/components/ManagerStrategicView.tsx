import { useCallback, useEffect, useState } from 'react';
import { Circle, CircleMarker, Polygon, Popup, Tooltip, useMap } from 'react-leaflet';
import { ApiError } from '../../shared/api/http-client';
import { BaseMap } from '../../shared/map/BaseMap';
import { Button } from '../../shared/ui/Button/Button';
import { Card } from '../../shared/ui/Card/Card';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { RiskBadge } from '../../shared/ui/RiskBadge/RiskBadge';
import { Select, type SelectOption } from '../../shared/ui/Select/Select';
import { Spinner } from '../../shared/ui/Spinner/Spinner';
import { classNames } from '../../shared/ui/class-names';
import styles from '../OperationsPanelPage.module.css';
import { operationsApi } from '../services/operations.api';
import type { ManagerStrategicOverview, PublicUser } from '../types';

interface ManagerStrategicViewProps {
  token: string;
  currentUser: PublicUser;
}

function MapCoordinateFocus({
  target,
}: {
  target?: { lat: number; lng: number };
}) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.setView([target.lat, target.lng], map.getZoom(), { animate: true });
    }
  }, [map, target]);
  return null;
}

export function ManagerStrategicView({ token, currentUser }: ManagerStrategicViewProps) {
  const [overview, setOverview] = useState<ManagerStrategicOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedCrewByAlert, setSelectedCrewByAlert] = useState<Record<string, string>>({});
  const [assigningAlertId, setAssigningAlertId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadStrategicData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationsApi.getManagerOverview(token);
      setOverview(data);
      if (data.alerts.length > 0 && !selectedAlertId) {
        setSelectedAlertId(data.alerts[0].alert.id);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar el Mapa Estratégico del municipio.',
      );
    } finally {
      setLoading(false);
    }
  }, [token, selectedAlertId]);

  useEffect(() => {
    void loadStrategicData();
  }, [loadStrategicData]);

  const handleAssignCrew = async (alertId: string) => {
    if (!overview) return;
    const crewId =
      selectedCrewByAlert[alertId] ||
      overview.alerts.find((a) => a.alert.id === alertId)?.assignment?.crewUserId ||
      overview.crews[0]?.id;

    if (!crewId) return;

    setAssigningAlertId(alertId);
    setFeedback(null);
    try {
      const updated = await operationsApi.assignTask(token, alertId, crewId);
      setFeedback(
        `Reporte asignado a ${updated.crewName} (${updated.crewUsername}).`,
      );
      await loadStrategicData();
    } catch (err) {
      setFeedback(
        err instanceof ApiError ? err.message : 'No se pudo asignar la tarea a la cuadrilla.',
      );
    } finally {
      setAssigningAlertId(null);
    }
  };

  const crewOptions: readonly SelectOption[] = (overview?.crews ?? []).map((crew) => ({
    value: crew.id,
    label: `${crew.fullName} (${crew.username})`,
  }));

  const selectedEntry = overview?.alerts.find((item) => item.alert.id === selectedAlertId);
  const focusCoordinates = selectedEntry
    ? {
        lat: selectedEntry.alert.location.coordinates[1],
        lng: selectedEntry.alert.location.coordinates[0],
      }
    : overview?.clusters[0]?.center;

  return (
    <div className={styles.page}>
      <div className={styles.strategicWorkspace}>
        <Card
          title={`Mapa Estratégico Municipal · ${currentUser.municipality}`}
          actions={
            <Button variant="ghost" onClick={() => void loadStrategicData()}>
              Recalcular Zonas de Trabajo
            </Button>
          }
        >
          <div className={styles.mapToolbar}>
            <span className={styles.clusterLegend}>
              🟢 Clustering Adaptativo (DBSCAN + Envolvente): {overview?.clusters.length ?? 0} Zonas
              de Trabajo ajustadas a la distancia exacta entre alertas
            </span>
          </div>

          <div className={styles.mapBox}>
            <BaseMap>
              <MapCoordinateFocus target={focusCoordinates} />

              {/* Envolvente Convexa (Convex Hull) y Círculo Envolvente Mínimo Adaptativo */}
              {overview?.clusters.map((cluster) => (
                <Circle
                  key={cluster.id}
                  center={[cluster.center.lat, cluster.center.lng]}
                  radius={cluster.radiusMeters}
                  pathOptions={{ className: styles.criticalZoneCircle }}
                >
                  <Tooltip direction="top" sticky>
                    <strong>{cluster.label}</strong> · {cluster.municipality}
                  </Tooltip>
                </Circle>
              ))}

              {overview?.clusters
                .filter((cluster) => cluster.convexHull.length >= 3)
                .map((cluster) => (
                  <Polygon
                    key={`${cluster.id}-hull`}
                    positions={cluster.convexHull}
                    pathOptions={{ className: styles.convexHullPolygon }}
                  />
                ))}

              {/* Marcadores individuales de cada reporte en el municipio */}
              {overview?.alerts.map(({ alert, assignment }) => {
                const lat = alert.location.coordinates[1];
                const lng = alert.location.coordinates[0];
                const markerClass =
                  alert.riskLevel === 'CRITICO'
                    ? styles.alertMarkerCritical
                    : alert.riskLevel === 'MEDIO'
                      ? styles.alertMarkerMedium
                      : styles.alertMarkerLow;

                return (
                  <CircleMarker
                    key={alert.id}
                    center={[lat, lng]}
                    radius={selectedAlertId === alert.id ? 11 : 8}
                    pathOptions={{ className: markerClass }}
                    eventHandlers={{
                      click: () => setSelectedAlertId(alert.id),
                    }}
                  >
                    <Popup>
                      <strong>{alert.address}</strong>
                      <br />
                      Obstrucción: {alert.obstructionPercentage}% ({alert.riskLevel})
                      <br />
                      {assignment
                        ? `Asignada a: ${assignment.crewName}`
                        : 'Sin cuadrilla asignada'}
                    </Popup>
                  </CircleMarker>
                );
              })}
            </BaseMap>
          </div>
        </Card>

        <Card
          title={`Reportes pendientes en ${currentUser.municipality} (${
            overview?.alerts.length ?? 0
          })`}
        >
          {feedback && (
            <div className={styles.successBox} role="status">
              {feedback}
            </div>
          )}

          {loading && !overview ? (
            <Spinner label="Cargando reportes y zonas de trabajo del municipio…" />
          ) : error ? (
            <EmptyState
              tone="error"
              icon="⚠️"
              title="No se pudieron cargar los reportes"
              description={error}
              action={<Button onClick={() => void loadStrategicData()}>Reintentar</Button>}
            />
          ) : !overview || overview.alerts.length === 0 ? (
            <EmptyState
              icon="✅"
              title="Sin reportes pendientes en tu municipio"
              description="Todas las alertas de acequias fueron limpiadas y cerradas por las cuadrillas."
            />
          ) : (
            <div className={styles.managerList}>
              {overview.alerts.map(({ alert, assignment }) => {
                const currentCrewSelection =
                  selectedCrewByAlert[alert.id] ??
                  assignment?.crewUserId ??
                  overview.crews[0]?.id ??
                  '';

                return (
                  <article
                    key={alert.id}
                    className={classNames(
                      styles.managerAlertCard,
                      selectedAlertId === alert.id && styles.managerAlertCardSelected,
                    )}
                    onClick={() => setSelectedAlertId(alert.id)}
                  >
                    <div className={styles.managerAlertHeader}>
                      <div>
                        <p className={styles.managerAlertTitle}>{alert.address}</p>
                        <p className={styles.managerAlertSub}>
                          Obstrucción: {alert.obstructionPercentage}% · Materiales:{' '}
                          {alert.detectionsCount}
                        </p>
                      </div>
                      <RiskBadge level={alert.riskLevel} />
                    </div>

                    {alert.notes && <p className={styles.managerAlertSub}>“{alert.notes}”</p>}

                    {assignment && (
                      <div className={styles.assignedBadge}>
                        👷 Asignada a: {assignment.crewName} (por {assignment.assignedByUsername})
                      </div>
                    )}

                    <div className={styles.assignRow}>
                      <Select
                        aria-label={`Seleccionar cuadrilla para ${alert.address}`}
                        options={crewOptions}
                        value={currentCrewSelection}
                        onChange={(e) =>
                          setSelectedCrewByAlert((prev) => ({
                            ...prev,
                            [alert.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        onClick={() => void handleAssignCrew(alert.id)}
                        disabled={assigningAlertId === alert.id || crewOptions.length === 0}
                      >
                        {assigningAlertId === alert.id
                          ? 'Asignando…'
                          : assignment
                            ? 'Reasignar cuadrilla'
                            : 'Asignar a Cuadrilla'}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
