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
export const VISION_PROVIDERS = ['mock', 'groq', 'gemini', 'huggingface', 'roboflow'] as const;
export const STORAGE_PROVIDERS = ['local', 's3', 'cloudinary'] as const;

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  APP_NAME?: string = 'Gestión Hídrica Integral';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number = 3000;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string = '*';

  @IsOptional()
  @IsIn(SATELLITE_PROVIDERS)
  SATELLITE_PROVIDER?: string = 'mock';

  @IsOptional()
  @IsInt()
  SATELLITE_MOCK_SEED?: number = 2026;

  @IsOptional()
  @IsNumber()
  MNDWI_LEAK_THRESHOLD?: number = 0.2;

  @IsOptional()
  @IsNumber()
  MNDWI_MEDIUM_THRESHOLD?: number = 0.3;

  @IsOptional()
  @IsNumber()
  MNDWI_CRITICAL_THRESHOLD?: number = 0.4;

  @IsOptional()
  @IsIn(VISION_PROVIDERS)
  AI_VISION_PROVIDER?: string = 'mock';

  @IsOptional()
  @IsString()
  GROQ_API_KEY?: string;

  @IsOptional()
  @IsString()
  GROQ_VISION_MODEL?: string = 'qwen/qwen3.8-27b';

  @IsOptional()
  @IsString()
  GEMINI_API_KEY?: string;

  @IsOptional()
  @IsNumber()
  UPLOAD_MAX_SIZE_MB?: number = 10;

  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsIn(STORAGE_PROVIDERS)
  STORAGE_PROVIDER?: string = 'local';
}

/**
 * Valida las variables de entorno de forma resiliente para desarrollo local y plataformas
 * cloud (Render). Si una variable opcional viene vacía ("") o no se pasa en el build,
 * aplica valores por defecto seguros sin bloquear el arranque del contenedor.
 */
export function validateEnv(config: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }
    sanitized[key] = value;
  }

  const validated = plainToInstance(EnvironmentVariables, sanitized, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: true });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n - ');
    throw new Error(`Configuración de entorno inválida:\n - ${details}`);
  }

  return {
    ...config,
    PORT: validated.PORT ?? 3000,
    CORS_ORIGIN: validated.CORS_ORIGIN ?? '*',
    SATELLITE_PROVIDER: validated.SATELLITE_PROVIDER ?? 'mock',
    AI_VISION_PROVIDER: validated.AI_VISION_PROVIDER ?? 'mock',
    STORAGE_PROVIDER: validated.STORAGE_PROVIDER ?? 'local',
  };
}
