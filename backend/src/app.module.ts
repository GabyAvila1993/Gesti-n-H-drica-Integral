import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig, satelliteConfig, visionConfig } from './core/config/app.config';
import { validateEnv } from './core/config/env.validation';
import { HealthModule } from './core/health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SatelliteMonitoringModule } from './satellite-monitoring/satellite-monitoring.module';
import { UrbanChannelsModule } from './urban-channels/urban-channels.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, satelliteConfig, visionConfig],
      validate: validateEnv,
    }),
    HealthModule,
    SatelliteMonitoringModule,
    UrbanChannelsModule,
    DashboardModule,
  ],
})
export class AppModule {}
