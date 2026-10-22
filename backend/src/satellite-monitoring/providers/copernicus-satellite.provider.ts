import { NotImplementedException } from '@nestjs/common';
import type { CanalSource } from '../domain/canal';
import type { MoistureReading } from '../domain/leak-alert';
import type { SatelliteProvider } from './satellite-provider.interface';

export interface CopernicusCredentials {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Adaptador preparado para Copernicus Data Space (Sentinel-2 L2A).
 * Pendiente: autenticación OAuth2, consulta a Sentinel Hub Process API con un evalscript
 * MNDWI = (B03 - B11) / (B03 + B11) y muestreo a lo largo de las trazas de canales.
 */
export class CopernicusSatelliteProvider implements SatelliteProvider {
  readonly name = 'copernicus';

  constructor(private readonly credentials: CopernicusCredentials) {}

  async getCanals(): Promise<CanalSource[]> {
    throw new NotImplementedException(
      'Proveedor Copernicus aún no implementado. Usá SATELLITE_PROVIDER=mock.',
    );
  }

  async getMoistureReadings(): Promise<MoistureReading[]> {
    if (!this.credentials.apiUrl || !this.credentials.clientId) {
      throw new NotImplementedException('Faltan credenciales de Copernicus en el .env');
    }
    throw new NotImplementedException(
      'Proveedor Copernicus aún no implementado. Usá SATELLITE_PROVIDER=mock.',
    );
  }
}
