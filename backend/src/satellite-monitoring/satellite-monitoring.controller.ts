import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SatelliteMonitoringService } from './application/satellite-monitoring.service';
import { AlertsQueryDto } from './dto/alerts-query.dto';

@ApiTags('Monitoreo Satelital')
@Controller('satellite')
export class SatelliteMonitoringController {
  constructor(private readonly service: SatelliteMonitoringService) {}

  /** Canales monitoreados con su traza GeoJSON y estado agregado. */
  @Get('canals')
  @ApiOperation({
    summary: 'Listar canales e hijuelas monitoreados',
    description:
      'Devuelve la red de canales matrices e hijuelas del Gran Mendoza con su geometría GeoJSON (LineString), caudal nominal, municipios atravesados y estado de severidad agregado.',
  })
  @ApiOkResponse({
    description: 'Colección de canales e hijuelas con geometría GeoJSON y severidad actual.',
  })
  getCanals() {
    return this.service.getCanals();
  }

  /** Alertas de fuga potencial por humedad anómala (MNDWI). */
  @Get('alerts')
  @ApiOperation({
    summary: 'Listar alertas de fugas satelitales (MNDWI)',
    description:
      'Devuelve las anomalías de humedad superficial detectadas por satélite (Sentinel-2 MNDWI) en los márgenes de los canales, filtrables opcionalmente por canal o severidad.',
  })
  @ApiOkResponse({
    description: 'Listado de fugas detectadas ordenadas por índice MNDWI descendente.',
  })
  getAlerts(@Query() query: AlertsQueryDto) {
    return this.service.getAlerts(query);
  }
}
