import type { GeoJsonPoint, LatLng } from '../../core/geo/geo.types';
import type { Municipality } from './canal';
import type { Severity } from './severity';

/**
 * Lectura de humedad sobre un punto adyacente al canal.
 * MNDWI (Modified Normalized Difference Water Index) = (Green - SWIR) / (Green + SWIR).
 * Valores > 0 indican presencia de agua / suelo saturado.
 */
export interface MoistureReading {
  canalId: string;
  position: LatLng;
  municipality: Municipality;
  mndwi: number;
  capturedAt: string;
  sceneId: string;
}

/** Alerta de fuga potencial generada a partir de una lectura anómala. */
export interface LeakAlert {
  id: string;
  canalId: string;
  canalName: string;
  municipality: Municipality;
  mndwi: number;
  severity: Severity;
  detectedAt: string;
  sceneId: string;
  location: GeoJsonPoint;
}
