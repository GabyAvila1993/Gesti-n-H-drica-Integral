import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { SEVERITIES, type Severity } from '../domain/severity';

export class AlertsQueryDto {
  @ApiPropertyOptional({
    description: 'Identificador único del canal o hijuela a filtrar',
    example: 'cacique-guaymallen',
  })
  @IsOptional()
  @IsString()
  canalId?: string;

  @ApiPropertyOptional({
    description: 'Nivel de severidad hídrica según umbral MNDWI',
    enum: SEVERITIES,
    example: 'CRITICO',
  })
  @IsOptional()
  @IsIn(SEVERITIES)
  severity?: Severity;
}
