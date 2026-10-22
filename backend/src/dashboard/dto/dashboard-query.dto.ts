import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { SEVERITIES, type Severity } from '../../satellite-monitoring/domain/severity';
import {
  MUNICIPALITIES,
  type UrbanMunicipality,
} from '../../urban-channels/domain/risk-level';
import { INCIDENT_SOURCES, type IncidentSource } from '../domain/dashboard.types';

export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Municipio del Gran Mendoza para filtrar métricas, mapa e incidentes',
    enum: MUNICIPALITIES,
    example: 'Maipú',
  })
  @IsOptional()
  @IsIn(MUNICIPALITIES)
  municipality?: UrbanMunicipality;

  @ApiPropertyOptional({
    description: 'Origen del incidente (SATELLITE para fugas MNDWI o URBAN para acequias)',
    enum: INCIDENT_SOURCES,
    example: 'SATELLITE',
  })
  @IsOptional()
  @IsIn(INCIDENT_SOURCES)
  source?: IncidentSource;

  @ApiPropertyOptional({
    description: 'Nivel de severidad del incidente',
    enum: SEVERITIES,
    example: 'CRITICO',
  })
  @IsOptional()
  @IsIn(SEVERITIES)
  severity?: Severity;
}
