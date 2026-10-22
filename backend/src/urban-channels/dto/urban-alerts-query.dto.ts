import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  MUNICIPALITIES,
  URBAN_RISK_LEVELS,
  type UrbanMunicipality,
  type UrbanRiskLevel,
} from '../domain/risk-level';

export class UrbanAlertsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar alertas por municipio del Gran Mendoza',
    enum: MUNICIPALITIES,
    example: 'Godoy Cruz',
  })
  @IsOptional()
  @IsIn(MUNICIPALITIES)
  municipality?: UrbanMunicipality;

  @ApiPropertyOptional({
    description: 'Filtrar alertas por nivel de riesgo de obstrucción',
    enum: URBAN_RISK_LEVELS,
    example: 'CRITICO',
  })
  @IsOptional()
  @IsIn(URBAN_RISK_LEVELS)
  riskLevel?: UrbanRiskLevel;
}
