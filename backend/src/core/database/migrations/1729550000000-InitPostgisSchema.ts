import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración inicial para PostgreSQL / Neon.tech:
 * 1. Activa la extensión espacial `postgis`.
 * 2. Crea las tablas `users`, `urban_alerts` (con columna `geom geometry(Point, 4326)` e índice GIST)
 *    y `task_assignments`.
 */
export class InitPostgisSchema1729550000000 implements MigrationInterface {
  name = 'InitPostgisSchema1729550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_role_enum" AS ENUM ('ADMIN', 'ENCARGADO', 'CUADRILLA');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "urban_alert_status_enum" AS ENUM ('PENDING', 'RESOLVED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "username" varchar(80) NOT NULL,
        "password" varchar(255) NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "municipality" varchar(80) NOT NULL,
        "full_name" varchar(140),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_municipality" ON "users" ("municipality");
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "full_name" varchar(140),
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT now();
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "urban_alerts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "analysis_id" varchar(80),
        "municipality" varchar(80) NOT NULL,
        "address" varchar(240) NOT NULL,
        "geom" geometry(Point, 4326) NOT NULL,
        "image_url" varchar(500),
        "risk_level" varchar(20) NOT NULL,
        "obstruction_percentage" integer NOT NULL DEFAULT 0,
        "detections" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "notes" text,
        "status" "urban_alert_status_enum" NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "resolved_at" TIMESTAMPTZ,
        "evidence_before_url" varchar(500),
        "evidence_after_url" varchar(500),
        CONSTRAINT "PK_urban_alerts_id" PRIMARY KEY ("id")
      );
    `);

    // Asegurar que tablas preexistentes en Neon.tech reciban todas las columnas nuevas (Auditoría Fotográfica y metadatos)
    await queryRunner.query(`
      ALTER TABLE "urban_alerts"
        ADD COLUMN IF NOT EXISTS "analysis_id" varchar(80),
        ADD COLUMN IF NOT EXISTS "image_url" varchar(500),
        ADD COLUMN IF NOT EXISTS "obstruction_percentage" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "detections" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "notes" text,
        ADD COLUMN IF NOT EXISTS "status" "urban_alert_status_enum" NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "evidence_before_url" varchar(500),
        ADD COLUMN IF NOT EXISTS "evidence_after_url" varchar(500);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_urban_alerts_geom" ON "urban_alerts" USING GIST ("geom");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_urban_alerts_municipality_status" ON "urban_alerts" ("municipality", "status");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "alert_id" uuid NOT NULL,
        "assigned_by_id" uuid NOT NULL,
        "crew_user_id" uuid NOT NULL,
        "status" "urban_alert_status_enum" NOT NULL DEFAULT 'PENDING',
        "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "resolved_at" TIMESTAMPTZ,
        "resolution_notes" text,
        "evidence_before_url" varchar(500),
        "evidence_after_url" varchar(500),
        CONSTRAINT "PK_task_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_assignments_alert" FOREIGN KEY ("alert_id") REFERENCES "urban_alerts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_task_assignments_assigned_by" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_task_assignments_crew_user" FOREIGN KEY ("crew_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "task_assignments"
        ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "resolution_notes" text,
        ADD COLUMN IF NOT EXISTS "evidence_before_url" varchar(500),
        ADD COLUMN IF NOT EXISTS "evidence_after_url" varchar(500);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "task_assignments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "urban_alerts";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
