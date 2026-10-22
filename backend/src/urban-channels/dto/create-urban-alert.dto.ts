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

class BoundingBoxDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  top: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  left: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  width: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  height: number;
}

class DetectedObjectDto {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsIn(DEBRIS_CATEGORIES)
  category: DebrisCategory;

  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @ValidateNested()
  @Type(() => BoundingBoxDto)
  bbox: BoundingBoxDto;
}

export class CreateUrbanAlertDto {
  @IsString()
  @MinLength(3)
  analysisId: string;

  @IsIn(MUNICIPALITIES)
  municipality: UrbanMunicipality;

  @IsString()
  @MinLength(4)
  @MaxLength(140)
  address: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  obstructionPercentage: number;

  @IsIn(URBAN_RISK_LEVELS)
  riskLevel: UrbanRiskLevel;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetectedObjectDto)
  detections: DetectedObjectDto[];

  @IsOptional()
  @IsString()
  @MaxLength(280)
  notes?: string;
}
