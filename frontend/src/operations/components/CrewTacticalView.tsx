import { useCallback, useEffect, useRef, useState } from 'react';
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
import type {
  CrewTacticalOverview,
  DailyResolvedTaskHistoryItem,
  PublicUser,
} from '../types';

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

/** Calcula la distancia geodésica en metros (fórmula de Haversine) para detectar desvíos > 50m. */
function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const DEFAULT_BASE_BY_MUNICIPALITY: Record<string, { lat: number; lng: number }> = {
  Capital: { lat: -32.8865, lng: -68.8485 },
  'Godoy Cruz': { lat: -32.9245, lng: -68.8435 },
  Guaymallén: { lat: -32.8988, lng: -68.8172 },
  'Las Heras': { lat: -32.8528, lng: -68.8286 },
  'Luján de Cuyo': { lat: -33.0055, lng: -68.8778 },
  Maipú: { lat: -32.9772, lng: -68.7885 },
};

const GPS_RECALC_THRESHOLD_METERS = 50;

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
  const [taskHistory, setTaskHistory] = useState<DailyResolvedTaskHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  // Ruteo vial OSRM bajo demanda ("Cómo llegar") + rastreo continuo watchPosition
  const [streetRoutes, setStreetRoutes] = useState<StreetRouteOption[]>([]);
  const [routingAlertId, setRoutingAlertId] = useState<string | null>(null);
  const [routingDestination, setRoutingDestination] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [calculatingRoutes, setCalculatingRoutes] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastRoutedOriginRef = useRef<{ lat: number; lng: number }>(fallbackBase);

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

  const syncSingleGpsFix = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setCrewCoords(fallbackBase);
      setGpsStatus(
        `GPS no disponible en este navegador · Base operativa (${currentUser.municipality})`,
      );
      return;
    }

    setGpsStatus('Sincronizando señal GPS actual…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
        };
        setCrewCoords(nextCoords);
        setGpsStatus('Señal GPS activa en tiempo real');
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
    syncSingleGpsFix();
  }, [syncSingleGpsFix]);

  // Al activar el modo "Cómo llegar" (routingDestination !== null), activa navigator.geolocation.watchPosition
  // y recalcula la ruta OSRM automáticamente si la cuadrilla se desplaza más de 50 metros.
  useEffect(() => {
    if (!routingDestination || !('geolocation' in navigator)) {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newPos = {
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
        };
        setCrewCoords(newPos);

        const movedMeters = haversineDistanceMeters(lastRoutedOriginRef.current, newPos);
        if (movedMeters > GPS_RECALC_THRESHOLD_METERS) {
          lastRoutedOriginRef.current = newPos;
          setGpsStatus(
            `Desplazamiento detectado (${Math.round(movedMeters)} m) · Recalculando ruta OSRM…`,
          );
          setCalculatingRoutes(true);
          void computeStreetRoutes(newPos, routingDestination)
            .then((updatedRoutes) => {
              setStreetRoutes(updatedRoutes);
              setGpsStatus('Rastreo GPS continuo activo (watchPosition · Ruta OSRM actualizada)');
            })
            .finally(() => {
              setCalculatingRoutes(false);
            });
        } else {
          setGpsStatus('Rastreo GPS continuo activo (watchPosition · desvío < 50 m)');
        }
      },
      () => {
        setGpsStatus(
          `Navegación activa desde base municipal (${currentUser.municipality})`,
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
    );

    watchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);
      watchIdRef.current = null;
    };
  }, [currentUser.municipality, routingDestination]);

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
        setRoutingDestination(null);
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

  const loadTasksHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const history = await operationsApi.getTasksHistory(token);
      setTaskHistory(history);
    } catch (err) {
      setHistoryError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar el historial de tareas completadas.',
      );
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTasksHistory();
  }, [loadTasksHistory]);

  const handleCalculateDirections = async (alertId: string, dest: { lat: number; lng: number }) => {
    setActiveAlertId(alertId);
    setRoutingAlertId(alertId);
    setRoutingDestination(dest);
    lastRoutedOriginRef.current = crewCoords;
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
        setRoutingDestination(null);
      }
      await Promise.all([loadTasks(), loadTasksHistory()]);
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

  return (
    <div className={styles.page}>
      <div className={styles.tacticalGrid}>
        <Card
          title={`Mapa Táctico Vial (OSRM) · ${currentUser.fullName}`}
          actions={
            <Button variant="ghost" onClick={syncSingleGpsFix}>
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
              {streetRoutes.map((route, index) =>
                index === 0 ? (
                  <span key={route.id} className={styles.routeBadgeFastest}>
                    🔵 {route.label}
                  </span>
                ) : (
                  <span key={route.id} className={styles.routeBadgeAlt}>
                    ⚪ Alternativa: {route.label}
                  </span>
                ),
              )}
            </div>
          )}

          <div className={styles.mapBox}>
            <BaseMap>
              <TacticalMapFocus target={targetCoords ?? crewCoords} />

              {/* Punto azul con la posición actual de la Cuadrilla (navigator.geolocation) */}
              <CircleMarker
                center={[crewCoords.lat, crewCoords.lng]}
                radius={10}
                pathOptions={{
                  color: '#ffffff',
                  weight: 3,
                  fillColor: '#2563eb',
                  fillOpacity: 1,
                  className: styles.crewPositionBlueDot,
                }}
              >
                <Tooltip direction="top" permanent>
                  🔵 Mi Cuadrilla ({currentUser.username})
                </Tooltip>
              </CircleMarker>

              {/* Renderizado condicional del array de rutas OSRM:
                  - index === 0 (más rápida): azul intenso (#2563eb) y mayor grosor
                  - index > 0 (alternativas): gris oscuro (#64748b), punteada y más fina */}
              {streetRoutes.map((route, index) => {
                const isPrimaryRoute = index === 0;
                return (
                  <Polyline
                    key={`${route.id}-${index}`}
                    positions={route.coordinates}
                    pathOptions={{
                      color: isPrimaryRoute ? '#2563eb' : '#64748b',
                      weight: isPrimaryRoute ? 6.5 : 4,
                      opacity: isPrimaryRoute ? 0.96 : 0.84,
                      dashArray: isPrimaryRoute ? undefined : '8 6',
                      lineCap: 'round',
                      lineJoin: 'round',
                      className: isPrimaryRoute
                        ? styles.routeFastestLine
                        : styles.routeAlternativeLine,
                    }}
                  >
                    <Tooltip permanent direction={isPrimaryRoute ? 'top' : 'center'}>
                      {isPrimaryRoute ? (
                        <>
                          <strong>Camino más rápido</strong> ({route.durationMinutes} min ·{' '}
                          {route.distanceKm} km)
                        </>
                      ) : (
                        <>
                          +{route.diffMinutes} min ({route.distanceKm} km)
                        </>
                      )}
                    </Tooltip>
                  </Polyline>
                );
              })}

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
                        <div
                          className={classNames(
                            styles.evidenceSlot,
                            beforeFile && styles.evidenceSlotReady,
                          )}
                        >
                          <span className={styles.evidenceLabel}>1. Evidencia ANTES *</span>
                          <div className={styles.uploadRow}>
                            <label className={styles.uploadModernBtn}>
                              <span aria-hidden="true">📷</span>
                              <span>Subir foto Antes</span>
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
                            </label>
                            {beforeFile ? (
                              <span className={styles.evidenceFileName}>
                                ✔ {beforeFile.name}
                              </span>
                            ) : (
                              <span className={styles.evidenceFileEmpty}>
                                Sin archivo seleccionado
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className={classNames(
                            styles.evidenceSlot,
                            afterFile && styles.evidenceSlotReady,
                          )}
                        >
                          <span className={styles.evidenceLabel}>2. Evidencia DESPUÉS *</span>
                          <div className={styles.uploadRow}>
                            <label className={styles.uploadModernBtn}>
                              <span aria-hidden="true">📷</span>
                              <span>Subir foto Después</span>
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
                            </label>
                            {afterFile ? (
                              <span className={styles.evidenceFileName}>
                                ✔ {afterFile.name}
                              </span>
                            ) : (
                              <span className={styles.evidenceFileEmpty}>
                                Sin archivo seleccionado
                              </span>
                            )}
                          </div>
                        </div>
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

        <Card title="Historial de Tareas Completadas (Hoy)" className={styles.taskHistoryCard}>
          {loadingHistory ? (
            <Spinner label="Cargando tareas completadas…" />
          ) : historyError ? (
            <div className={styles.errorBox} role="status">
              {historyError}
              <Button variant="ghost" onClick={() => void loadTasksHistory()}>
                Reintentar
              </Button>
            </div>
          ) : taskHistory.length === 0 ? (
            <p className={styles.taskHistoryEmpty}>Todavía no hay tareas completadas hoy.</p>
          ) : (
            <ul className={styles.taskHistoryList}>
              {taskHistory.map((task) => (
                <li key={task.id} className={styles.taskHistoryItem}>
                  <span className={styles.taskHistoryCheck} aria-label="Tarea completada">
                    ✅
                  </span>
                  <span className={styles.taskHistoryAddress}>{task.address}</span>
                  <time
                    className={styles.taskHistoryTime}
                    dateTime={task.resolvedAt}
                    title={new Date(task.resolvedAt).toLocaleString('es-AR')}
                  >
                    {new Intl.DateTimeFormat('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(task.resolvedAt))}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
