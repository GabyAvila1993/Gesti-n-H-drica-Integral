import type { Municipality } from '../app.config';
import type { RiskLevel, Severity } from '../shared/domain/risk-level';

/** GeoJSON usa el orden [longitud, latitud]. */
export type GeoJsonPosition = [number, number];

export interface CanalTelemetryProperties {
  name: string;
  code: string;
  riskLevel: RiskLevel;
  heightCm: number;
  flowLs: number;
}

export interface Canal {
  id: string;
  name: string;
  code?: string;
  description: string;
  nominalFlowM3s: number;
  municipalities: Municipality[];
  status: RiskLevel;
  activeAlerts: number;
  properties?: CanalTelemetryProperties;
  geometry: {
    type: 'LineString';
    coordinates: GeoJsonPosition[];
    properties?: CanalTelemetryProperties;
  };
}

export interface LeakAlert {
  id: string;
  canalId: string;
  canalName: string;
  municipality: Municipality;
  mndwi: number;
  severity: Severity;
  detectedAt: string;
  sceneId: string;
  location: { type: 'Point'; coordinates: GeoJsonPosition };
}

/** Convierte una posición GeoJSON al formato [lat, lng] que usa Leaflet. */
export const toLatLng = ([lng, lat]: GeoJsonPosition): [number, number] => [lat, lng];
