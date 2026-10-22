import { Module } from '@nestjs/common';
import { satelliteConfig, type SatelliteConfig } from '../core/config/app.config';
import { SatelliteMonitoringService } from './application/satellite-monitoring.service';
import { CopernicusSatelliteProvider } from './providers/copernicus-satellite.provider';
import { MockSatelliteProvider } from './providers/mock-satellite.provider';
import {
  SATELLITE_PROVIDER,
  type SatelliteProvider,
} from './providers/satellite-provider.interface';
import { SatelliteMonitoringController } from './satellite-monitoring.controller';

@Module({
  controllers: [SatelliteMonitoringController],
  providers: [
    {
      provide: SATELLITE_PROVIDER,
      inject: [satelliteConfig.KEY],
      useFactory: (config: SatelliteConfig): SatelliteProvider =>
        config.provider === 'copernicus'
          ? new CopernicusSatelliteProvider(config.copernicus)
          : new MockSatelliteProvider(config.mockSeed),
    },
    SatelliteMonitoringService,
  ],
  exports: [SatelliteMonitoringService],
})
export class SatelliteMonitoringModule {}
