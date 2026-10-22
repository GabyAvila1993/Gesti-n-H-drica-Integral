import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DEBRIS_CATEGORIES, type DebrisCategory } from '../domain/detection';
import {
  MUNICIPALITIES,
  URBAN_RISK_LEVELS,
  type UrbanMunicipality,
  type UrbanRiskLevel,
} from '../domain/risk-level';

export class BoundingBoxDto {
  @ApiProperty({ description: 'Posición superior en porcentaje (0 a 100)', example: 22 })
  @IsNumber()
  @Min(0)
  @Max(100)
  top: number;

  @ApiProperty({ description: 'Posición izquierda en porcentaje (0 a 100)', example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  left: number;

  @ApiProperty({ description: 'Ancho del recuadro en porcentaje (0 a 100)', example: 44 })
  @IsNumber()
  @Min(0)
  @Max(100)
  width: number;

  @ApiProperty({ description: 'Alto del recuadro en porcentaje (0 a 100)', example: 28 })
  @IsNumber()
  @Min(0)
  @Max(100)
  height: number;
}

export class DetectedObjectDto {
  @ApiProperty({ description: 'Identificador de la detección', example: 'det-crit-1' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Etiqueta descriptiva del residuo u objeto', example: 'Rama caída de plátano' })
  @IsString()
  label: string;

  @ApiProperty({
    description: 'Categoría del objeto detectado',
    enum: DEBRIS_CATEGORIES,
    example: 'branch',
  })
  @IsIn(DEBRIS_CATEGORIES)
  category: DebrisCategory;

  @ApiProperty({ description: 'Porcentaje de confianza del modelo (0 a 100)', example: 96 })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @ApiProperty({ description: 'Geometría porcentual del bounding box', type: () => BoundingBoxDto })
  @ValidateNested()
  @Type(() => BoundingBoxDto)
  bbox: BoundingBoxDto;
}

export class CreateUrbanAlertDto {
  @ApiProperty({
    description: 'UUID del análisis de imagen asociado',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  })
  @IsString()
  @MinLength(3)
  analysisId: string;

  @ApiProperty({
    description: 'Municipio del Gran Mendoza donde se ubica la acequia',
    enum: MUNICIPALITIES,
    example: 'Capital',
  })
  @IsIn(MUNICIPALITIES)
  municipality: UrbanMunicipality;

  @ApiProperty({
    description: 'Intersección o dirección de la acequia inspeccionada',
    example: 'Av. Emilio Civit y Belgrano',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(140)
  address: string;

  @ApiProperty({
    description: 'Porcentaje de obstrucción estimado (0 a 100)',
    example: 78,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  obstructionPercentage: number;

  @ApiProperty({
    description: 'Nivel de riesgo de anegamiento calculado',
    enum: URBAN_RISK_LEVELS,
    example: 'CRITICO',
  })
  @IsIn(URBAN_RISK_LEVELS)
  riskLevel: UrbanRiskLevel;

  @ApiProperty({
    description: 'Objetos detectados en el cauce durante la inspección',
    type: () => [DetectedObjectDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetectedObjectDto)
  detections: DetectedObjectDto[];

  @ApiPropertyOptional({
    description: 'Observaciones adicionales del inspector o vecino',
    example: 'Rejilla del sifón obstruida tras viento Zonda.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  notes?: string;

  @ApiPropertyOptional({
    description: 'URL relativa de la fotografía almacenada por StorageService (ej. /uploads/urban-alerts/...)',
    example: '/uploads/urban-alerts/1729550000-a1b2c3d4.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}
