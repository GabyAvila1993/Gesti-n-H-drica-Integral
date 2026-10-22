import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './application/dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  /** KPIs rápidos consolidados (filtrables opcionalmente por municipio). */
  @Get('metrics')
  getMetrics(@Query() query: DashboardQueryDto) {
    return this.service.getMetrics(query.municipality);
  }

  /** Listado unificado de incidentes (fugas satelitales + acequias obstruidas). */
  @Get('records')
  getRecords(@Query() query: DashboardQueryDto) {
    return this.service.getRecords(query);
  }

  /** Capas unificadas para el mapa central de Mendoza (canales, fugas y acequias). */
  @Get('map')
  getMapOverview(@Query() query: DashboardQueryDto) {
    return this.service.getMapOverview(query.municipality);
  }
}
