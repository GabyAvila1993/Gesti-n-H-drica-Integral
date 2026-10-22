import { Controller, Get, Inject } from '@nestjs/common';
import {
  appConfig,
  satelliteConfig,
  visionConfig,
  type AppConfig,
  type SatelliteConfig,
  type VisionConfig,
} from '../config/app.config';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(appConfig.KEY) private readonly app: AppConfig,
    @Inject(satelliteConfig.KEY) private readonly satellite: SatelliteConfig,
    @Inject(visionConfig.KEY) private readonly vision: VisionConfig,
  ) {}

  @Get()
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
