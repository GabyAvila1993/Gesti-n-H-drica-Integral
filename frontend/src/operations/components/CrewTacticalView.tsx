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

function computeDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return Math.round(2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h))));
}

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
  const [notesByAlert, setNotesByAlert] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const requestGpsPosition = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setCrewCoords(fallbackBase);
      setGpsStatus(
        `GPS no disponible en este navegador · Punto base operativo (${currentUser.municipality})`,
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
          `Ubicación simulada en base municipal (${currentUser.municipality}) — permiso GPS no concedido`,
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

  const handleResolveTask = async (alertId: string) => {
    setResolvingId(alertId);
    setBannerMsg(null);
    try {
      const note = notesByAlert[alertId];
      await operationsApi.resolveCrewTask(token, alertId, note);
      setBannerMsg(
        '✅ Acequia marcada como LIMPIA (Estado RESOLVED). El marcador se retiró del mapa público y se sumó al histórico del Administrador.',
      );
      await loadTasks();
    } catch (err) {
      setBannerMsg(
        err instanceof ApiError ? err.message : 'No se pudo cerrar la tarea seleccionada.',
      );
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

  const routeDistanceMeters = targetCoords
    ? computeDistanceMeters(crewCoords, targetCoords)
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.tacticalGrid}>
        <Card
          title={`Mapa Táctico de Cuadrilla · ${currentUser.fullName}`}
          actions={
            <Button variant="ghost" onClick={requestGpsPosition}>
              📍 Actualizar mi GPS
            </Button>
          }
        >
          <div className={styles.gpsStatusBanner}>
            <span>🔵 Tu ubicación: {gpsStatus}</span>
            {routeDistanceMeters !== null && (
              <span>
                Distancia a tarea activa:{' '}
                <strong>
                  {routeDistanceMeters >= 1000
                    ? `${(routeDistanceMeters / 1000).toFixed(2)} km`
                    : `${routeDistanceMeters} m`}
                </strong>
              </span>
            )}
          </div>

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

              {/* Línea de ruteo desde el punto azul de la cuadrilla hasta la alerta asignada */}
              {targetCoords && (
                <Polyline
                  positions={[
                    [crewCoords.lat, crewCoords.lng],
                    [targetCoords.lat, targetCoords.lng],
                  ]}
                  pathOptions={{ className: styles.crewRouteLine }}
                />
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
            <div className={styles.successBox} role="status">
              {bannerMsg}
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
                const distMeters = computeDistanceMeters(crewCoords, alertCoord);

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
                          Municipio: {alert.municipality} · Distancia:{' '}
                          {distMeters >= 1000
                            ? `${(distMeters / 1000).toFixed(2)} km`
                            : `${distMeters} m`}
                        </p>
                      </div>
                      <RiskBadge level={alert.riskLevel} />
                    </div>

                    <p className={styles.managerAlertSub}>
                      Obstrucción detectada: <strong>{alert.obstructionPercentage}%</strong> ·
                      Asignado por: {assignment.assignedByName}
                    </p>

                    {alert.notes && <p className={styles.managerAlertSub}>“{alert.notes}”</p>}

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
                      disabled={resolvingId === alert.id}
                      onClick={() => void handleResolveTask(alert.id)}
                    >
                      {resolvingId === alert.id
                        ? 'Cerrando tarea y actualizando mapa…'
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
