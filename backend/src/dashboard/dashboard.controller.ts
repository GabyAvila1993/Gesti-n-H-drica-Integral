import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './application/dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@ApiTags('Dashboard Central')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  /** KPIs rápidos consolidados (filtrables opcionalmente por municipio). */
  @Get('metrics')
  @ApiOperation({
    summary: 'Obtener métricas consolidadas (KPIs)',
    description:
      'Consolida el total de canales monitoreados, fugas satelitales detectadas, alertas de acequias urbanas, porcentaje promedio de obstrucción e incidentes críticos activos.',
  })
  @ApiOkResponse({
    description: 'Objeto con indicadores clave de rendimiento (KPIs) del sistema hídrico.',
  })
  getMetrics(@Query() query: DashboardQueryDto) {
    return this.service.getMetrics(query.municipality);
  }

  /** Listado unificado de incidentes (fugas satelitales + acequias obstruidas). */
  @Get('records')
  @ApiOperation({
    summary: 'Listar registros unificados de incidentes hídricos',
    description:
      'Combina en una sola tabla normalizada las fugas satelitales (MNDWI) y las alertas de acequias urbanas, ordenadas por severidad y fecha.',
  })
  @ApiOkResponse({
    description: 'Colección unificada de incidentes satelitales y urbanos.',
  })
  getRecords(@Query() query: DashboardQueryDto) {
    return this.service.getRecords(query);
  }

  /** Capas unificadas para el mapa central de Mendoza (canales, fugas y acequias). */
  @Get('map')
  @ApiOperation({
    summary: 'Obtener capas geográficas unificadas del Gran Mendoza',
    description:
      'Devuelve simultáneamente las polilíneas de los 12 canales e hijuelas, los marcadores de fugas satelitales y los pines de acequias obstruidas.',
  })
  @ApiOkResponse({
    description: 'Capas GeoJSON listas para renderizar en el mapa unificado.',
  })
  getMapOverview(@Query() query: DashboardQueryDto) {
    return this.service.getMapOverview(query.municipality);
  }
}
