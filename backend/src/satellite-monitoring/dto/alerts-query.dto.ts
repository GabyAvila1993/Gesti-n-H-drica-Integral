import { IsIn, IsOptional, IsString } from 'class-validator';
import { SEVERITIES, type Severity } from '../domain/severity';

export class AlertsQueryDto {
  @IsOptional()
  @IsString()
  canalId?: string;

  @IsOptional()
  @IsIn(SEVERITIES)
  severity?: Severity;
}
