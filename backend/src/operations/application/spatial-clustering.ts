import type { UrbanRiskLevel } from '../../urban-channels/domain/risk-level';
import type { UrbanAlert } from '../../urban-channels/domain/urban-alert';
import type { CriticalZoneCluster } from '../domain/operations.types';

const EARTH_RADIUS_METERS = 6371000;

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
 * Agrupa espacialmente las alertas urbanas pendientes dentro de un radio (`radiusMeters`,
 * p. ej. 1000m en zoom general o 200m en zoom cercano) para identificar "Zonas Críticas"
 * con concentración de obstrucciones (clustering dinámico).
 */
export function computeCriticalZoneClusters(
  alerts: UrbanAlert[],
  radiusMeters: number,
): CriticalZoneCluster[] {
  if (alerts.length === 0) return [];

  const points = alerts.map((alert) => ({
    alert,
    coord: {
      lng: alert.location.coordinates[0],
      lat: alert.location.coordinates[1],
    },
  }));

  const assigned = new Set<string>();
  const clusters: CriticalZoneCluster[] = [];

  for (let i = 0; i < points.length; i++) {
    const seed = points[i];
    if (assigned.has(seed.alert.id)) continue;

    const group = [seed];
    assigned.add(seed.alert.id);

    for (let j = i + 1; j < points.length; j++) {
      const candidate = points[j];
      if (assigned.has(candidate.alert.id)) continue;

      const dist = haversineDistanceMeters(seed.coord, candidate.coord);
      if (dist <= radiusMeters) {
        group.push(candidate);
        assigned.add(candidate.alert.id);
      }
    }

    // Se considera "Zona Crítica" agrupada cuando hay 2 o más alertas en el radio,
    // o cuando una alerta de nivel CRITICO requiere zona operativa de intervención
    if (group.length >= 2 || seed.alert.riskLevel === 'CRITICO') {
      const sumLat = group.reduce((acc, item) => acc + item.coord.lat, 0);
      const sumLng = group.reduce((acc, item) => acc + item.coord.lng, 0);
      const center = {
        lat: Number((sumLat / group.length).toFixed(5)),
        lng: Number((sumLng / group.length).toFixed(5)),
      };

      const criticalCount = group.filter((item) => item.alert.riskLevel === 'CRITICO').length;
      const hasMedium = group.some((item) => item.alert.riskLevel === 'MEDIO');
      const dominantRisk: UrbanRiskLevel =
        criticalCount > 0 ? 'CRITICO' : hasMedium ? 'MEDIO' : 'BAJO';

      const visualRadius =
        group.length >= 2
          ? Math.max(radiusMeters, 180)
          : Math.min(radiusMeters, 240);

      clusters.push({
        id: `cluster-${clusters.length + 1}-${radiusMeters}`,
        center,
        radiusMeters: visualRadius,
        alertsCount: group.length,
        criticalCount,
        dominantRisk,
        alertIds: group.map((g) => g.alert.id),
        municipality: seed.alert.municipality,
        label:
          group.length >= 2
            ? `Zona Crítica (${group.length} alertas en ${radiusMeters >= 1000 ? '1 km' : `${radiusMeters} m`})`
            : `Foco Crítico (${seed.alert.address})`,
      });
    }
  }

  return clusters;
}
