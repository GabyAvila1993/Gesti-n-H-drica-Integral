/** Posición geográfica en grados decimales (WGS84). */
export interface LatLng {
  lat: number;
  lng: number;
}

/** GeoJSON usa el orden [longitud, latitud]. */
export type GeoJsonPosition = [number, number];

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: GeoJsonPosition[];
}

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: GeoJsonPosition;
}

export const toGeoJsonPosition = ({ lat, lng }: LatLng): GeoJsonPosition => [lng, lat];

/** Interpola linealmente entre dos puntos (t ∈ [0, 1]). */
export const interpolate = (from: LatLng, to: LatLng, t: number): LatLng => ({
  lat: from.lat + (to.lat - from.lat) * t,
  lng: from.lng + (to.lng - from.lng) * t,
});
