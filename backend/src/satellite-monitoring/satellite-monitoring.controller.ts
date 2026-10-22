import { Controller, Get, Query } from '@nestjs/common';
import { SatelliteMonitoringService } from './application/satellite-monitoring.service';
import { AlertsQueryDto } from './dto/alerts-query.dto';

@Controller('satellite')
export class SatelliteMonitoringController {
  constructor(private readonly service: SatelliteMonitoringService) {}

  /** Canales monitoreados con su traza GeoJSON y estado agregado. */
  @Get('canals')
  getCanals() {
    return this.service.getCanals();
  }

  /** Alertas de fuga potencial por humedad anómala (MNDWI). */
  @Get('alerts')
  getAlerts(@Query() query: AlertsQueryDto) {
    return this.service.getAlerts(query);
  }
}
