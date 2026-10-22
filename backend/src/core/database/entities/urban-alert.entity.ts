import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { GeoJsonPoint } from '../../geo/geo.types';
import type { DetectedObject } from '../../../urban-channels/domain/detection';
import type { UrbanMunicipality, UrbanRiskLevel } from '../../../urban-channels/domain/risk-level';

export enum UrbanAlertStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
}

@Entity({ name: 'urban_alerts' })
export class UrbanAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'analysis_id', type: 'varchar', length: 80, nullable: true })
  analysis_id!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  municipality!: UrbanMunicipality;

  @Column({ type: 'varchar', length: 240 })
  address!: string;

  /**
   * Columna espacial nativa PostGIS `geometry(Point, 4326)` con índice GIST.
   */
  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  geom!: GeoJsonPoint;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  image_url!: string | null;

  @Index()
  @Column({ name: 'risk_level', type: 'varchar', length: 20 })
  risk_level!: UrbanRiskLevel;

  @Column({ name: 'obstruction_percentage', type: 'int', default: 0 })
  obstruction_percentage!: number;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  detections!: DetectedObject[];

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  /**
   * Soft Delete lógico: cuando una cuadrilla limpia la acequia, pasa a `RESOLVED`
   * para ocultarse del mapa público pero conservarse en el histórico estadístico del Admin.
   */
  @Index()
  @Column({
    type: 'enum',
    enum: UrbanAlertStatus,
    default: UrbanAlertStatus.PENDING,
  })
  status!: UrbanAlertStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolved_at!: Date | null;
}
