import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export const SATELLITE_PROVIDERS = ['mock', 'copernicus'] as const;
export const VISION_PROVIDERS = ['mock', 'huggingface', 'roboflow'] as const;
export const STORAGE_PROVIDERS = ['local', 's3', 'cloudinary'] as const;

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  APP_NAME?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsIn(SATELLITE_PROVIDERS)
  SATELLITE_PROVIDER: string;

  @IsOptional()
  @IsInt()
  SATELLITE_MOCK_SEED?: number;

  @IsOptional()
  @IsNumber()
  MNDWI_LEAK_THRESHOLD?: number;

  @IsOptional()
  @IsNumber()
  MNDWI_MEDIUM_THRESHOLD?: number;

  @IsOptional()
  @IsNumber()
  MNDWI_CRITICAL_THRESHOLD?: number;

  @IsIn(VISION_PROVIDERS)
  AI_VISION_PROVIDER: string;

  @IsOptional()
  @IsNumber()
  UPLOAD_MAX_SIZE_MB?: number;

  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsIn(STORAGE_PROVIDERS)
  STORAGE_PROVIDER?: string;
}

/**
 * Valida el .env al iniciar. Si falta algo obligatorio o un valor es inválido,
 * la aplicación no arranca y se informa el error de forma explícita.
 */
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n - ');
    throw new Error(`Configuración de entorno inválida:\n - ${details}`);
  }

  return config;
}
