import { registerAs } from '@nestjs/config';

/**
 * Configuración central de la aplicación (backend).
 * Toda la información proviene de variables de entorno (.env).
 */
export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'Gestión Hídrica Integral',
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim()),
  globalPrefix: 'api',
}));

export const satelliteConfig = registerAs('satellite', () => ({
  provider: process.env.SATELLITE_PROVIDER ?? 'mock',
  mockSeed: Number(process.env.SATELLITE_MOCK_SEED ?? 2026),
  copernicus: {
    apiUrl: process.env.COPERNICUS_API_URL ?? '',
    clientId: process.env.COPERNICUS_CLIENT_ID ?? '',
    clientSecret: process.env.COPERNICUS_CLIENT_SECRET ?? '',
  },
  thresholds: {
    leak: Number(process.env.MNDWI_LEAK_THRESHOLD ?? 0.2),
    medium: Number(process.env.MNDWI_MEDIUM_THRESHOLD ?? 0.3),
    critical: Number(process.env.MNDWI_CRITICAL_THRESHOLD ?? 0.4),
  },
}));

export const visionConfig = registerAs('vision', () => ({
  provider: process.env.AI_VISION_PROVIDER ?? 'mock',
  huggingface: {
    apiUrl: process.env.HUGGINGFACE_API_URL ?? '',
    token: process.env.HUGGINGFACE_TOKEN ?? '',
  },
  roboflow: {
    apiUrl: process.env.ROBOFLOW_API_URL ?? '',
    apiKey: process.env.ROBOFLOW_API_KEY ?? '',
  },
  uploadMaxSizeMb: Number(process.env.UPLOAD_MAX_SIZE_MB ?? 10),
}));

export type AppConfig = ReturnType<typeof appConfig>;
export type SatelliteConfig = ReturnType<typeof satelliteConfig>;
export type VisionConfig = ReturnType<typeof visionConfig>;
