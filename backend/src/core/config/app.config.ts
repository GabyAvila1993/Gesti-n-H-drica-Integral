import { registerAs } from '@nestjs/config';

/**
 * Configuración central de la aplicación (backend).
 * Toda la información proviene de variables de entorno (.env) con valores por defecto
 * seguros para desarrollo local y despliegue cloud (Render).
 */
export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME || 'Gestión Hídrica Integral',
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  globalPrefix: 'api',
}));

export const satelliteConfig = registerAs('satellite', () => ({
  provider: process.env.SATELLITE_PROVIDER || 'mock',
  mockSeed: Number(process.env.SATELLITE_MOCK_SEED || 2026),
  copernicus: {
    apiUrl: process.env.COPERNICUS_API_URL ?? '',
    clientId: process.env.COPERNICUS_CLIENT_ID ?? '',
    clientSecret: process.env.COPERNICUS_CLIENT_SECRET ?? '',
  },
  thresholds: {
    leak: Number(process.env.MNDWI_LEAK_THRESHOLD || 0.2),
    medium: Number(process.env.MNDWI_MEDIUM_THRESHOLD || 0.3),
    critical: Number(process.env.MNDWI_CRITICAL_THRESHOLD || 0.4),
  },
}));

export const visionConfig = registerAs('vision', () => ({
  provider: process.env.AI_VISION_PROVIDER || 'mock',
  huggingface: {
    apiUrl: process.env.HUGGINGFACE_API_URL ?? '',
    token: process.env.HUGGINGFACE_TOKEN ?? '',
  },
  roboflow: {
    apiUrl: process.env.ROBOFLOW_API_URL ?? '',
    apiKey: process.env.ROBOFLOW_API_KEY ?? '',
  },
  uploadMaxSizeMb: Number(process.env.UPLOAD_MAX_SIZE_MB || 10),
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL ?? '',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE || 'gestion_hidrica',
  ssl:
    process.env.DB_SSL === 'true' ||
    (process.env.DATABASE_URL ?? '').includes('sslmode=require') ||
    (process.env.DATABASE_URL ?? '').includes('neon.tech'),
  synchronize: process.env.DB_SYNCHRONIZE !== 'false',
}));

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'ghi-mendoza-jwt-secret-2026-operativa-municipal',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
}));

export const storageConfig = registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER || 'local',
  localDir: process.env.STORAGE_LOCAL_DIR || 'uploads',
  publicPath: process.env.STORAGE_PUBLIC_PATH || '/uploads',
}));

export type AppConfig = ReturnType<typeof appConfig>;
export type SatelliteConfig = ReturnType<typeof satelliteConfig>;
export type VisionConfig = ReturnType<typeof visionConfig>;
export type DatabaseConfig = ReturnType<typeof databaseConfig>;
export type AuthConfig = ReturnType<typeof authConfig>;
export type StorageConfig = ReturnType<typeof storageConfig>;
