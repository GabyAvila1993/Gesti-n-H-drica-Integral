import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  authConfig,
  databaseConfig,
  satelliteConfig,
  storageConfig,
  visionConfig,
} from './core/config/app.config';
import { validateEnv } from './core/config/env.validation';
import { DatabaseModule } from './core/database/database.module';
import { HealthModule } from './core/health/health.module';
import { StorageModule } from './core/storage/storage.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OperationsModule } from './operations/operations.module';
import { SatelliteMonitoringModule } from './satellite-monitoring/satellite-monitoring.module';
import { UrbanChannelsModule } from './urban-channels/urban-channels.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [
        appConfig,
        satelliteConfig,
        visionConfig,
        databaseConfig,
        authConfig,
        storageConfig,
      ],
      validate: validateEnv,
    }),
    DatabaseModule,
    StorageModule,
    HealthModule,
    SatelliteMonitoringModule,
    UrbanChannelsModule,
    DashboardModule,
    OperationsModule,
  ],
})
export class AppModule {}
