import type { CanalSource } from '../domain/canal';
import type { MoistureReading } from '../domain/leak-alert';

export const SATELLITE_PROVIDER = Symbol('SATELLITE_PROVIDER');

/**
 * Contrato que debe cumplir cualquier fuente satelital (mock, Copernicus/Sentinel-2, etc.).
 * El servicio de aplicación depende únicamente de esta interfaz.
 */
export interface SatelliteProvider {
  readonly name: string;
  getCanals(): Promise<CanalSource[]>;
  getMoistureReadings(): Promise<MoistureReading[]>;
}
