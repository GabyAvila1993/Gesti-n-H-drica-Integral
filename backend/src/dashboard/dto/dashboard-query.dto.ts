import { IsIn, IsOptional } from 'class-validator';
import { SEVERITIES, type Severity } from '../../satellite-monitoring/domain/severity';
import {
  MUNICIPALITIES,
  type UrbanMunicipality,
} from '../../urban-channels/domain/risk-level';
import { INCIDENT_SOURCES, type IncidentSource } from '../domain/dashboard.types';

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(MUNICIPALITIES)
  municipality?: UrbanMunicipality;

  @IsOptional()
  @IsIn(INCIDENT_SOURCES)
  source?: IncidentSource;

  @IsOptional()
  @IsIn(SEVERITIES)
  severity?: Severity;
}
