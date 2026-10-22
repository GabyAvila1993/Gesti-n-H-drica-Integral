import type { UrbanRiskLevel } from '../../urban-channels/domain/risk-level';
import type { UrbanAlert } from '../../urban-channels/domain/urban-alert';
import type { CriticalZoneCluster } from '../domain/operations.types';

const EARTH_RADIUS_METERS = 6371000;
const DEFAULT_DBSCAN_EPS_METERS = 650;
const WORK_ZONE_BUFFER_METERS = 35;

/**
 * Calcula la distancia geodésica (Haversine, equivalente a `ST_DistanceSphere` en PostGIS)
 * en metros entre dos coordenadas `(lat, lng)`.
 */
export function haversineDistanceMeters(
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
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Calcula la Envolvente Convexa (Convex Hull — algoritmo Monotone Chain) de un conjunto
 * de coordenadas y devuelve el anillo de vértices `[lat, lng][]`.
 */
export function computeConvexHull(
  coords: Array<{ lat: number; lng: number }>,
): Array<[number, number]> {
  if (coords.length <= 2) {
    return coords.map((c) => [c.lat, c.lng]);
  }

  const sorted = [...coords].sort((a, b) =>
    a.lng !== b.lng ? a.lng - b.lng : a.lat - b.lat,
  );

  const cross = (
    o: { lat: number; lng: number },
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ) => (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);

  const lower: Array<{ lat: number; lng: number }> = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Array<{ lat: number; lng: number }> = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  upper.pop();
  lower.pop();
  return [...lower, ...upper].map((p) => [p.lat, p.lng]);
}

/**
 * Clustering Adaptativo (DBSCAN + Círculo Envolvente Mínimo y Convex Hull):
 * - Agrupa puntos conectados por densidad espacial (`epsMeters`, equivalente a `ST_ClusterDBSCAN`).
 * - En lugar de usar un radio estático (1km o 200m), calcula el centro geométrico real de los
 *   extremos del grupo y ajusta el radio exactamente a la dispersión física de las alertas
 *   (`maxDistFromCenter + 35m` de margen de maniobra), envolviendo con precisión la "Zona de Trabajo".
 */
export function computeCriticalZoneClusters(
  alerts: UrbanAlert[],
  epsMeters: number = DEFAULT_DBSCAN_EPS_METERS,
): CriticalZoneCluster[] {
  if (alerts.length === 0) return [];

  const points = alerts.map((alert) => ({
    alert,
    coord: {
      lng: alert.location.coordinates[0],
      lat: alert.location.coordinates[1],
    },
  }));

  const visited = new Set<string>();
  const clusters: CriticalZoneCluster[] = [];

  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    if (visited.has(start.alert.id)) continue;

    // Expansión por densidad (DBSCAN transitivo)
    const queue = [start];
    visited.add(start.alert.id);
    const group: typeof points = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);

      for (const candidate of points) {
        if (visited.has(candidate.alert.id)) continue;
        const dist = haversineDistanceMeters(current.coord, candidate.coord);
        if (dist <= epsMeters) {
          visited.add(candidate.alert.id);
          queue.push(candidate);
        }
      }
    }

    // Solo formar Zona de Trabajo cuando hay al menos 2 alertas agrupadas o 1 alerta CRÍTICA puntual
    if (group.length >= 2 || start.alert.riskLevel === 'CRITICO') {
      // Encontrar el par de alertas más distantes dentro del grupo para ubicar el punto medio exacto
      let maxPairDist = 0;
      let extremeA = group[0].coord;
      let extremeB = group[0].coord;

      for (let a = 0; a < group.length; a++) {
        for (let b = a + 1; b < group.length; b++) {
          const d = haversineDistanceMeters(group[a].coord, group[b].coord);
          if (d > maxPairDist) {
            maxPairDist = d;
            extremeA = group[a].coord;
            extremeB = group[b].coord;
          }
        }
      }

      // Centro del círculo envolvente mínimo (combinando punto medio de extremos y centroide)
      const centroidLat = group.reduce((acc, item) => acc + item.coord.lat, 0) / group.length;
      const centroidLng = group.reduce((acc, item) => acc + item.coord.lng, 0) / group.length;
      const center = {
        lat: Number(((extremeA.lat + extremeB.lat) * 0.35 + centroidLat * 0.3).toFixed(5)),
        lng: Number(((extremeA.lng + extremeB.lng) * 0.35 + centroidLng * 0.3).toFixed(5)),
      };

      // Calcular la distancia exacta desde el centro hasta la alerta más alejada del grupo
      let maxRadiusFromCenter = 0;
      for (const item of group) {
        const d = haversineDistanceMeters(center, item.coord);
        if (d > maxRadiusFromCenter) {
          maxRadiusFromCenter = d;
        }
      }

      // El radio envuelve exactamente a los miembros del cluster (+35m de margen visual en calle)
      const adaptiveRadiusMeters =
        group.length >= 2
          ? Math.max(60, Math.round(maxRadiusFromCenter + WORK_ZONE_BUFFER_METERS))
          : 75;

      const spanMeters = Math.round(maxPairDist);
      const convexHull = computeConvexHull(group.map((g) => g.coord));

      const criticalCount = group.filter((item) => item.alert.riskLevel === 'CRITICO').length;
      const hasMedium = group.some((item) => item.alert.riskLevel === 'MEDIO');
      const dominantRisk: UrbanRiskLevel =
        criticalCount > 0 ? 'CRITICO' : hasMedium ? 'MEDIO' : 'BAJO';

      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        center,
        radiusMeters: adaptiveRadiusMeters,
        spanMeters,
        convexHull,
        alertsCount: group.length,
        criticalCount,
        dominantRisk,
        alertIds: group.map((g) => g.alert.id),
        municipality: start.alert.municipality,
        label:
          group.length >= 2
            ? `Zona de Trabajo (${group.length} alertas · extensión ${spanMeters} m · radio envolvente ${adaptiveRadiusMeters} m)`
            : `Foco Puntual (${start.alert.address} · radio ${adaptiveRadiusMeters} m)`,
      });
    }
  }

  return clusters;
}
