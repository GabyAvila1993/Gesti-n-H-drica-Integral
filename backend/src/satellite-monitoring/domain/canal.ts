import type { GeoJsonLineString, LatLng } from '../../core/geo/geo.types';
import type { Severity } from './severity';

/** Municipios del Gran Mendoza cubiertos por el sistema. */
export type Municipality =
  | 'Capital'
  | 'Godoy Cruz'
  | 'Guaymallén'
  | 'Las Heras'
  | 'Luján de Cuyo'
  | 'Maipú';

/** Vértice de la traza de un canal, etiquetado con el municipio que atraviesa. */
export interface CanalVertex extends LatLng {
  municipality: Municipality;
}

export type CanalStatus = 'NORMAL' | Severity;

/** Propiedades de telemetría hidrométrica según estándar del Departamento General de Irrigación (DGI). */
export interface CanalTelemetryProperties {
  name: string;
  code: string;
  riskLevel: CanalStatus;
  heightCm: number;
  flowLs: number;
}

/** Definición cruda del canal tal como la entrega un proveedor satelital/catastral. */
export interface CanalSource {
  id: string;
  name: string;
  code?: string;
  description: string;
  nominalFlowM3s: number;
  riskLevel?: CanalStatus;
  heightCm?: number;
  flowLs?: number;
  properties?: Partial<CanalTelemetryProperties>;
  vertices: CanalVertex[];
}

/** Canal enriquecido que expone la API con propiedades GeoJSON de telemetría DGI. */
export interface Canal {
  id: string;
  name: string;
  code: string;
  description: string;
  nominalFlowM3s: number;
  municipalities: Municipality[];
  status: CanalStatus;
  activeAlerts: number;
  properties: CanalTelemetryProperties;
  geometry: GeoJsonLineString & {
    properties: CanalTelemetryProperties;
  };
}
