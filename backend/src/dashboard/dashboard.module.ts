import { Module } from '@nestjs/common';
import { SatelliteMonitoringModule } from '../satellite-monitoring/satellite-monitoring.module';
import { UrbanChannelsModule } from '../urban-channels/urban-channels.module';
import { DashboardService } from './application/dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [SatelliteMonitoringModule, UrbanChannelsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
