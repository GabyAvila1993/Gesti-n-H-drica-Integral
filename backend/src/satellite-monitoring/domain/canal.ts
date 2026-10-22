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

/** Definición cruda del canal tal como la entrega un proveedor satelital/catastral. */
export interface CanalSource {
  id: string;
  name: string;
  description: string;
  nominalFlowM3s: number;
  vertices: CanalVertex[];
}

export type CanalStatus = 'NORMAL' | Severity;

/** Canal enriquecido que expone la API. */
export interface Canal {
  id: string;
  name: string;
  description: string;
  nominalFlowM3s: number;
  municipalities: Municipality[];
  status: CanalStatus;
  activeAlerts: number;
  geometry: GeoJsonLineString;
}
