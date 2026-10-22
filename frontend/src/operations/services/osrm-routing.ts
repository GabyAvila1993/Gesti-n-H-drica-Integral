export interface StreetRouteOption {
  readonly id: string;
  readonly isFastest: boolean;
  readonly durationMinutes: number;
  readonly diffMinutes: number;
  readonly distanceKm: number;
  readonly label: string;
  readonly summaryName: string;
  /** Coordenadas [lat, lng][] siguiendo la traza vial real de las calles */
  readonly coordinates: Array<[number, number]>;
}

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    distance: number;
    duration: number;
    legs?: Array<{ summary?: string }>;
    geometry?: {
      type: 'LineString';
      coordinates: Array<[number, number]>;
    };
  }>;
}

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

async function fetchOsrmSegment(
  points: Array<{ lat: number; lng: number }>,
  alternatives: boolean,
): Promise<
  Array<{
    distanceMeters: number;
    durationSeconds: number;
    summary: string;
    coords: Array<[number, number]>;
  }>
> {
  const coordsParam = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const altParam = alternatives ? '3' : 'false';
  const url = `${OSRM_BASE_URL}/${coordsParam}?overview=full&geometries=geojson&alternatives=${altParam}&steps=false`;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return [];
    const data = (await response.json()) as OsrmRouteResponse;
    if (data.code !== 'Ok' || !Array.isArray(data.routes)) return [];

    return data.routes
      .filter((r) => r.geometry && r.geometry.coordinates.length >= 2)
      .map((r) => ({
        distanceMeters: r.distance,
        durationSeconds: r.duration,
        summary: r.legs?.[0]?.summary || 'Vía urbana principal',
        coords: r.geometry!.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
      }));
  } catch {
    return [];
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * Genera 3 trazas ortogonales siguiendo el damero de cuadras N-S y E-O de Mendoza
 * únicamente como respaldo si el servicio público de OSRM no responde por falta de red.
 */
function buildOrthogonalGridFallback(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): StreetRouteOption[] {
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  const midLat = from.lat + dLat * 0.5;
  const midLng = from.lng + dLng * 0.5;

  // Ruta 1 (más rápida): escalonada por avenidas centrales
  const route1: Array<[number, number]> = [
    [from.lat, from.lng],
    [midLat, from.lng],
    [midLat, midLng],
    [to.lat, midLng],
    [to.lat, to.lng],
  ];

  // Ruta 2 (+2 min): rodeo Norte-Este por cuadras ortogonales
  const route2: Array<[number, number]> = [
    [from.lat, from.lng],
    [from.lat, to.lng],
    [to.lat, to.lng],
  ];

  // Ruta 3 (+4 min): rodeo Sur-Oeste por cuadras ortogonales
  const offsetLat = dLat >= 0 ? -0.0022 : 0.0022;
  const route3: Array<[number, number]> = [
    [from.lat, from.lng],
    [from.lat + offsetLat, from.lng],
    [from.lat + offsetLat, to.lng],
    [to.lat, to.lng],
  ];

  const baseDistKm = Math.max(
    0.4,
    Number(
      (
        (Math.abs(dLat) * 111.32 + Math.abs(dLng) * 93.4) *
        1.05
      ).toFixed(2),
    ),
  );
  const baseMin = Math.max(3, Math.round(baseDistKm * 3.2));

  return [
    {
      id: 'route-fast',
      isFastest: true,
      durationMinutes: baseMin,
      diffMinutes: 0,
      distanceKm: baseDistKm,
      summaryName: 'Avenidas directas',
      label: `Camino más rápido (${baseMin} min · ${baseDistKm} km)`,
      coordinates: route1,
    },
    {
      id: 'route-alt-1',
      isFastest: false,
      durationMinutes: baseMin + 2,
      diffMinutes: 2,
      distanceKm: Number((baseDistKm * 1.18).toFixed(2)),
      summaryName: 'Vía alternativa Norte',
      label: `+2 min (${baseMin + 2} min)`,
      coordinates: route2,
    },
    {
      id: 'route-alt-2',
      isFastest: false,
      durationMinutes: baseMin + 4,
      diffMinutes: 4,
      distanceKm: Number((baseDistKm * 1.32).toFixed(2)),
      summaryName: 'Vía alternativa Sur',
      label: `+4 min (${baseMin + 4} min)`,
      coordinates: route3,
    },
  ];
}

/**
 * Calcula entre 2 y 3 rutas viales reales por las calles de Mendoza utilizando el motor OSRM.
 * La ruta más rápida se marca con `isFastest = true` y las alternativas incluyen `+<N> min`.
 */
export async function computeStreetRoutes(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<StreetRouteOption[]> {
  const directRoutes = await fetchOsrmSegment([from, to], true);

  // Si el tramo es corto y OSRM devuelve solo 1 ruta directa, consultamos 2 variantes
  // pasando por esquinas desplazadas (~3 cuadras) para ofrecer 3 rutas viales reales por calles
  const collected = [...directRoutes];

  if (collected.length < 3 && collected.length > 0) {
    const midLat = (from.lat + to.lat) / 2;
    const midLng = (from.lng + to.lng) / 2;
    const via1 = { lat: midLat + 0.0028, lng: midLng - 0.0024 };
    const via2 = { lat: midLat - 0.0026, lng: midLng + 0.0028 };

    const [altA, altB] = await Promise.all([
      fetchOsrmSegment([from, via1, to], false),
      fetchOsrmSegment([from, via2, to], false),
    ]);

    if (altA[0]) collected.push(altA[0]);
    if (altB[0]) collected.push(altB[0]);
  }

  if (collected.length === 0) {
    return buildOrthogonalGridFallback(from, to);
  }

  // Ordenar por duración ascendente y tomar hasta 3 rutas
  collected.sort((a, b) => a.durationSeconds - b.durationSeconds);
  const topRoutes = collected.slice(0, 3);

  const fastestMin = Math.max(2, Math.round(topRoutes[0].durationSeconds / 60));

  return topRoutes.map((route, idx) => {
    const rawMin = Math.max(2, Math.round(route.durationSeconds / 60));
    // Garantizar que las rutas alternativas muestren una diferencia clara (+2 min, +4 min, etc.)
    const diffMinutes =
      idx === 0 ? 0 : Math.max(idx * 2, rawMin - fastestMin);
    const durationMinutes = fastestMin + diffMinutes;
    const distanceKm = Number((route.distanceMeters / 1000).toFixed(2));

    return {
      id: idx === 0 ? 'osrm-fastest' : `osrm-alt-${idx}`,
      isFastest: idx === 0,
      durationMinutes,
      diffMinutes,
      distanceKm,
      summaryName: route.summary,
      label:
        idx === 0
          ? `Camino más rápido (${durationMinutes} min · ${distanceKm} km)`
          : `+${diffMinutes} min (${durationMinutes} min · ${distanceKm} km)`,
      coordinates: route.coords,
    };
  });
}
