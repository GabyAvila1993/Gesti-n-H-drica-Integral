import { useCallback, useEffect, useState } from 'react';
import { CircleMarker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
import { ApiError } from '../../shared/api/http-client';
import { BaseMap } from '../../shared/map/BaseMap';
import { Button } from '../../shared/ui/Button/Button';
import { Card } from '../../shared/ui/Card/Card';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Input } from '../../shared/ui/Input/Input';
import { RiskBadge } from '../../shared/ui/RiskBadge/RiskBadge';
import { Spinner } from '../../shared/ui/Spinner/Spinner';
import { classNames } from '../../shared/ui/class-names';
import styles from '../OperationsPanelPage.module.css';
import { operationsApi } from '../services/operations.api';
import { computeStreetRoutes, type StreetRouteOption } from '../services/osrm-routing';
import type { CrewTacticalOverview, PublicUser } from '../types';

interface CrewTacticalViewProps {
  token: string;
  currentUser: PublicUser;
}

function TacticalMapFocus({ target }: { target: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([target.lat, target.lng], 14, { animate: true });
  }, [map, target]);
  return null;
}

const DEFAULT_BASE_BY_MUNICIPALITY: Record<string, { lat: number; lng: number }> = {
  Capital: { lat: -32.8865, lng: -68.8485 },
  'Godoy Cruz': { lat: -32.9245, lng: -68.8435 },
  Guaymallén: { lat: -32.8988, lng: -68.8172 },
  'Las Heras': { lat: -32.8528, lng: -68.8286 },
  'Luján de Cuyo': { lat: -33.0055, lng: -68.8778 },
  Maipú: { lat: -32.9772, lng: -68.7885 },
};

export function CrewTacticalView({ token, currentUser }: CrewTacticalViewProps) {
  const fallbackBase =
    DEFAULT_BASE_BY_MUNICIPALITY[currentUser.municipality] ??
    DEFAULT_BASE_BY_MUNICIPALITY.Capital;

  const [crewCoords, setCrewCoords] = useState<{ lat: number; lng: number }>(fallbackBase);
  const [gpsStatus, setGpsStatus] = useState<string>(
    'Solicitando ubicación GPS del dispositivo…',
  );

  const [overview, setOverview] = useState<CrewTacticalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  // Ruteo vial OSRM bajo demanda ("Cómo llegar")
  const [streetRoutes, setStreetRoutes] = useState<StreetRouteOption[]>([]);
  const [routingAlertId, setRoutingAlertId] = useState<string | null>(null);
  const [calculatingRoutes, setCalculatingRoutes] = useState(false);

  // Evidencias fotográficas obligatorias ("Antes" y "Después") por alerta
  const [beforePhotoByAlert, setBeforePhotoByAlert] = useState<Record<string, File | undefined>>(
    {},
  );
  const [afterPhotoByAlert, setAfterPhotoByAlert] = useState<Record<string, File | undefined>>({});
  const [notesByAlert, setNotesByAlert] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  const requestGpsPosition = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setCrewCoords(fallbackBase);
      setGpsStatus(
        `GPS no disponible en este navegador · Base operativa (${currentUser.municipality})`,
      );
      return;
    }

    setGpsStatus('Obteniendo señal GPS actual…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCrewCoords({
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
        });
        setGpsStatus('Señal GPS activa (navigator.geolocation en tiempo real)');
      },
      () => {
        setCrewCoords(fallbackBase);
        setGpsStatus(
          `Ubicación en base municipal (${currentUser.municipality}) — permiso GPS no concedido`,
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 15000 },
    );
  }, [currentUser.municipality, fallbackBase]);

  useEffect(() => {
    requestGpsPosition();
  }, [requestGpsPosition]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationsApi.getCrewTasks(token);
      setOverview(data);
      if (data.pendingTasks.length > 0) {
        setActiveAlertId((prev) =>
          data.pendingTasks.some((t) => t.alert.id === prev)
            ? prev
            : data.pendingTasks[0].alert.id,
        );
      } else {
        setActiveAlertId(null);
        setStreetRoutes([]);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar las tareas asignadas a la cuadrilla.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleCalculateDirections = async (alertId: string, dest: { lat: number; lng: number }) => {
    setActiveAlertId(alertId);
    setRoutingAlertId(alertId);
    setCalculatingRoutes(true);
    try {
      const routes = await computeStreetRoutes(crewCoords, dest);
      setStreetRoutes(routes);
    } finally {
      setCalculatingRoutes(false);
    }
  };

  const handleResolveTask = async (alertId: string) => {
    const beforeFile = beforePhotoByAlert[alertId];
    const afterFile = afterPhotoByAlert[alertId];

    if (!beforeFile || !afterFile) {
      setBannerMsg({
        tone: 'error',
        text: 'Es obligatorio subir las 2 fotografías ("Antes" y "Después") antes de cerrar la tarea.',
      });
      return;
    }

    setResolvingId(alertId);
    setBannerMsg(null);
    try {
      await operationsApi.resolveCrewTask(token, {
        alertId,
        evidenceBefore: beforeFile,
        evidenceAfter: afterFile,
        resolutionNotes: notesByAlert[alertId],
      });
      setBannerMsg({
        tone: 'success',
        text: '✅ Acequia marcada como LIMPIA (Estado RESOLVED) con evidencia fotográfica Antes/Después guardada en /uploads.',
      });
      if (routingAlertId === alertId) {
        setStreetRoutes([]);
        setRoutingAlertId(null);
      }
      await loadTasks();
    } catch (err) {
      setBannerMsg({
        tone: 'error',
        text: err instanceof ApiError ? err.message : 'No se pudo cerrar la tarea seleccionada.',
      });
    } finally {
      setResolvingId(null);
    }
  };

  const activeTask =
    overview?.pendingTasks.find((t) => t.alert.id === activeAlertId) ??
    overview?.pendingTasks[0];

  const targetCoords = activeTask
    ? {
        lat: activeTask.alert.location.coordinates[1],
        lng: activeTask.alert.location.coordinates[0],
      }
    : null;

  const alternativeRoutes = streetRoutes.filter((r) => !r.isFastest);
  const fastestRoute = streetRoutes.find((r) => r.isFastest);

  return (
    <div className={styles.page}>
      <div className={styles.tacticalGrid}>
        <Card
          title={`Mapa Táctico Vial (OSRM) · ${currentUser.fullName}`}
          actions={
            <Button variant="ghost" onClick={requestGpsPosition}>
              📍 Actualizar mi GPS
            </Button>
          }
        >
          <div className={styles.gpsStatusBanner}>
            <span>🔵 Tu ubicación: {gpsStatus}</span>
            {activeTask && targetCoords && (
              <Button
                onClick={() => void handleCalculateDirections(activeTask.alert.id, targetCoords)}
                disabled={calculatingRoutes}
              >
                {calculatingRoutes ? 'Calculando calles…' : '🧭 Cómo llegar'}
              </Button>
            )}
          </div>

          {streetRoutes.length > 0 && (
            <div className={styles.routesSummaryBar} aria-label="Rutas viales calculadas">
              {fastestRoute && (
                <span className={styles.routeBadgeFastest}>🔵 {fastestRoute.label}</span>
              )}
              {alternativeRoutes.map((alt) => (
                <span key={alt.id} className={styles.routeBadgeAlt}>
                  ⚪ Alternativa: {alt.label}
                </span>
              ))}
            </div>
          )}

          <div className={styles.mapBox}>
            <BaseMap>
              <TacticalMapFocus target={targetCoords ?? crewCoords} />

              {/* Punto azul con la posición actual de la Cuadrilla (navigator.geolocation) */}
              <CircleMarker
                center={[crewCoords.lat, crewCoords.lng]}
                radius={10}
                pathOptions={{ className: styles.crewPositionBlueDot }}
              >
                <Tooltip direction="top" permanent>
                  🔵 Mi Cuadrilla ({currentUser.username})
                </Tooltip>
              </CircleMarker>

              {/* Rutas viales alternativas por calles (líneas grises con +N min) */}
              {alternativeRoutes.map((alt) => (
                <Polyline
                  key={alt.id}
                  positions={alt.coordinates}
                  pathOptions={{ className: styles.routeAlternativeLine }}
                >
                  <Tooltip permanent direction="center">
                    +{alt.diffMinutes} min ({alt.distanceKm} km)
                  </Tooltip>
                </Polyline>
              ))}

              {/* Ruta más rápida por calles reales (línea azul gruesa) */}
              {fastestRoute && (
                <Polyline
                  key={fastestRoute.id}
                  positions={fastestRoute.coordinates}
                  pathOptions={{ className: styles.routeFastestLine }}
                >
                  <Tooltip permanent direction="top">
                    <strong>Camino más rápido</strong> ({fastestRoute.durationMinutes} min ·{' '}
                    {fastestRoute.distanceKm} km)
                  </Tooltip>
                </Polyline>
              )}

              {/* Marcadores de las tareas asignadas a la cuadrilla */}
              {overview?.pendingTasks.map(({ alert }) => {
                const lat = alert.location.coordinates[1];
                const lng = alert.location.coordinates[0];
                return (
                  <CircleMarker
                    key={alert.id}
                    center={[lat, lng]}
                    radius={activeTask?.alert.id === alert.id ? 11 : 8}
                    pathOptions={{ className: styles.alertMarkerCritical }}
                    eventHandlers={{
                      click: () => setActiveAlertId(alert.id),
                    }}
                  >
                    <Popup>
                      <strong>{alert.address}</strong>
                      <br />
                      Obstrucción: {alert.obstructionPercentage}% ({alert.riskLevel})
                    </Popup>
                  </CircleMarker>
                );
              })}
            </BaseMap>
          </div>
        </Card>

        <Card
          title={`Mis Tareas Asignadas (${overview?.pendingTasks.length ?? 0})`}
          actions={
            <Button variant="ghost" onClick={() => void loadTasks()}>
              Recargar
            </Button>
          }
        >
          {bannerMsg && (
            <div
              className={
                bannerMsg.tone === 'success' ? styles.successBox : styles.errorBox
              }
              role="status"
            >
              {bannerMsg.text}
            </div>
          )}

          {loading && !overview ? (
            <Spinner label="Cargando hojas de ruta asignadas a tu cuadrilla…" />
          ) : error ? (
            <EmptyState
              tone="error"
              icon="⚠️"
              title="No se pudieron cargar tus tareas"
              description={error}
              action={<Button onClick={() => void loadTasks()}>Reintentar</Button>}
            />
          ) : !overview || overview.pendingTasks.length === 0 ? (
            <EmptyState
              icon="🎉"
              title="¡Sin tareas pendientes!"
              description="Completaste todas las limpiezas asignadas a tu cuadrilla. Aguardando nuevas órdenes del Encargado."
            />
          ) : (
            <div className={styles.managerList}>
              {overview.pendingTasks.map(({ alert, assignment }) => {
                const alertCoord = {
                  lat: alert.location.coordinates[1],
                  lng: alert.location.coordinates[0],
                };
                const beforeFile = beforePhotoByAlert[alert.id];
                const afterFile = afterPhotoByAlert[alert.id];
                const bothPhotosReady = Boolean(beforeFile && afterFile);

                return (
                  <article
                    key={alert.id}
                    className={classNames(
                      styles.tacticalTaskCard,
                      activeTask?.alert.id === alert.id && styles.tacticalTaskCardActive,
                    )}
                    onClick={() => setActiveAlertId(alert.id)}
                  >
                    <div className={styles.managerAlertHeader}>
                      <div>
                        <p className={styles.managerAlertTitle}>{alert.address}</p>
                        <p className={styles.managerAlertSub}>
                          Municipio: {alert.municipality} · Obstrucción:{' '}
                          <strong>{alert.obstructionPercentage}%</strong>
                        </p>
                      </div>
                      <RiskBadge level={alert.riskLevel} />
                    </div>

                    <div className={styles.assignRow}>
                      <Button
                        variant="secondary"
                        onClick={() => void handleCalculateDirections(alert.id, alertCoord)}
                        disabled={calculatingRoutes && routingAlertId === alert.id}
                      >
                        {calculatingRoutes && routingAlertId === alert.id
                          ? 'Calculando rutas por calles…'
                          : '🧭 Cómo llegar (Ver 3 rutas viales)'}
                      </Button>
                    </div>

                    {alert.notes && <p className={styles.managerAlertSub}>“{alert.notes}”</p>}

                    {/* Auditoría Fotográfica Obligatoria: Antes y Después */}
                    <div className={styles.evidenceSection}>
                      <span className={styles.evidenceSectionTitle}>
                        📷 Auditoría Fotográfica Obligatoria (Antes y Después)
                      </span>

                      <div className={styles.evidenceGrid}>
                        <label
                          className={classNames(
                            styles.evidenceSlot,
                            beforeFile && styles.evidenceSlotReady,
                          )}
                        >
                          <span className={styles.evidenceLabel}>1. Foto ANTES *</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className={styles.evidenceFileInput}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              setBeforePhotoByAlert((prev) => ({
                                ...prev,
                                [alert.id]: file,
                              }));
                            }}
                          />
                          {beforeFile && (
                            <span className={styles.evidenceFileName}>✔ {beforeFile.name}</span>
                          )}
                        </label>

                        <label
                          className={classNames(
                            styles.evidenceSlot,
                            afterFile && styles.evidenceSlotReady,
                          )}
                        >
                          <span className={styles.evidenceLabel}>2. Foto DESPUÉS *</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className={styles.evidenceFileInput}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              setAfterPhotoByAlert((prev) => ({
                                ...prev,
                                [alert.id]: file,
                              }));
                            }}
                          />
                          {afterFile && (
                            <span className={styles.evidenceFileName}>✔ {afterFile.name}</span>
                          )}
                        </label>
                      </div>

                      {!bothPhotosReady && (
                        <span className={styles.evidenceMissingHint}>
                          ⚠️ Debés adjuntar ambas fotos ("Antes" y "Después") para habilitar el
                          cierre de la tarea. (Asignada por {assignment.assignedByName})
                        </span>
                      )}
                    </div>

                    <Input
                      label="Observación de cierre (opcional)"
                      placeholder="Ej.: Se retiraron ramas y botellas con camión volcador."
                      value={notesByAlert[alert.id] ?? ''}
                      onChange={(e) =>
                        setNotesByAlert((prev) => ({
                          ...prev,
                          [alert.id]: e.target.value,
                        }))
                      }
                    />

                    <button
                      type="button"
                      className={styles.resolveBigButton}
                      disabled={!bothPhotosReady || resolvingId === alert.id}
                      onClick={() => void handleResolveTask(alert.id)}
                    >
                      {resolvingId === alert.id
                        ? 'Subiendo evidencias y cerrando tarea…'
                        : '✅ Acequia Limpia / Cerrar Tarea'}
                    </button>
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
