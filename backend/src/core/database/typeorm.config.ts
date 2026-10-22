import { DataSource, type DataSourceOptions } from 'typeorm';
import type { DatabaseConfig } from '../config/app.config';
import { TaskAssignmentEntity } from './entities/task-assignment.entity';
import { UrbanAlertEntity } from './entities/urban-alert.entity';
import { UserEntity } from './entities/user.entity';
import { InitPostgisSchema1729550000000 } from './migrations/1729550000000-InitPostgisSchema';

export const DATABASE_ENTITIES = [
  UserEntity,
  UrbanAlertEntity,
  TaskAssignmentEntity,
];

/**
 * Construye las opciones de conexión de TypeORM para PostgreSQL / Neon.tech con soporte PostGIS.
 * Nota: `synchronize` se ejecuta explícitamente DESPUÉS de `CREATE EXTENSION IF NOT EXISTS postgis;`
 * en el inicializador para garantizar que el tipo `geometry(Point, 4326)` exista en bases nuevas.
 */
export function buildTypeOrmOptions(config: DatabaseConfig): DataSourceOptions {
  const baseOptions: DataSourceOptions = {
    type: 'postgres',
    entities: DATABASE_ENTITIES,
    migrations: [InitPostgisSchema1729550000000],
    synchronize: false,
    logging: false,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  };

  if (config.url && config.url.trim().length > 0) {
    return {
      ...baseOptions,
      url: config.url.trim(),
    };
  }

  return {
    ...baseOptions,
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
  };
}

/**
 * Instancia exportada para ejecución de migraciones por CLI de TypeORM.
 */
export const AppDataSource = new DataSource(
  buildTypeOrmOptions({
    url: process.env.DATABASE_URL ?? '',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'gestion_hidrica',
    ssl:
      process.env.DB_SSL === 'true' ||
      (process.env.DATABASE_URL ?? '').includes('sslmode=require') ||
      (process.env.DATABASE_URL ?? '').includes('neon.tech'),
    synchronize: process.env.DB_SYNCHRONIZE !== 'false',
  }),
);
