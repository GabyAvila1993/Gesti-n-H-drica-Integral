import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  appConfig,
  satelliteConfig,
  visionConfig,
  type AppConfig,
  type SatelliteConfig,
  type VisionConfig,
} from '../config/app.config';

@ApiTags('Salud del Sistema')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(appConfig.KEY) private readonly app: AppConfig,
    @Inject(satelliteConfig.KEY) private readonly satellite: SatelliteConfig,
    @Inject(visionConfig.KEY) private readonly vision: VisionConfig,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Verificar estado operativo del backend',
    description:
      'Devuelve el estado de salud del servidor, el nombre configurado de la aplicación y los proveedores activos para monitoreo satelital y visión artificial.',
  })
  @ApiOkResponse({
    description: 'Servidor operativo y proveedores inicializados correctamente.',
  })
  check() {
    return {
      status: 'ok',
      appName: this.app.name,
      satelliteProvider: this.satellite.provider,
      visionProvider: this.vision.provider,
      timestamp: new Date().toISOString(),
    };
  }
}
