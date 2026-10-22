import { Global, Logger, Module, type OnApplicationShutdown, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { databaseConfig, type DatabaseConfig } from '../config/app.config';
import { InitPostgisSchema1729550000000 } from './migrations/1729550000000-InitPostgisSchema';
import { buildTypeOrmOptions } from './typeorm.config';

export const POSTGRES_DATA_SOURCE = Symbol('POSTGRES_DATA_SOURCE');

@Global()
@Module({
  providers: [
    {
      provide: POSTGRES_DATA_SOURCE,
      inject: [databaseConfig.KEY],
      useFactory: async (config: DatabaseConfig): Promise<DataSource | null> => {
        const logger = new Logger('TypeOrmPostGIS');

        if (!config.url || config.url.trim().length === 0) {
          logger.log(
            'DATABASE_URL no definida en .env — operando con almacén en memoria compatible con PostGIS. Configurá DATABASE_URL (ej. Neon.tech) para persistencia SQL.',
          );
          return null;
        }

        try {
          const dataSource = new DataSource(buildTypeOrmOptions(config));
          await dataSource.initialize();

          // 1. Activar extensión PostGIS antes de sincronizar tablas con geometry(Point, 4326)
          await dataSource.query('CREATE EXTENSION IF NOT EXISTS postgis;');

          // 2. Ejecutar esquema inicial / sincronización
          if (config.synchronize) {
            const queryRunner = dataSource.createQueryRunner();
            try {
              const migration = new InitPostgisSchema1729550000000();
              await migration.up(queryRunner);
            } finally {
              await queryRunner.release();
            }
          }

          logger.log('Conectado a PostgreSQL (Neon.tech) con extensión PostGIS activa.');
          return dataSource;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.warn(
            `No se pudo establecer conexión con PostgreSQL (${message}). Se continuará con persistencia en memoria de respaldo.`,
          );
          return null;
        }
      },
    },
  ],
  exports: [POSTGRES_DATA_SOURCE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(
    @Inject(POSTGRES_DATA_SOURCE) private readonly dataSource: DataSource | null,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}
