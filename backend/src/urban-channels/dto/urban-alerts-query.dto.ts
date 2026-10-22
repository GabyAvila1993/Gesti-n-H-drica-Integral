import { IsIn, IsOptional } from 'class-validator';
import {
  MUNICIPALITIES,
  URBAN_RISK_LEVELS,
  type UrbanMunicipality,
  type UrbanRiskLevel,
} from '../domain/risk-level';

export class UrbanAlertsQueryDto {
  @IsOptional()
  @IsIn(MUNICIPALITIES)
  municipality?: UrbanMunicipality;

  @IsOptional()
  @IsIn(URBAN_RISK_LEVELS)
  riskLevel?: UrbanRiskLevel;
}
