import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UrbanAlertEntity, UrbanAlertStatus } from './urban-alert.entity';
import { UserEntity } from './user.entity';

/**
 * Entidad relacional que vincula una `UrbanAlert` con el `User` (Encargado que la asigna)
 * y el `User` (Cuadrilla que la ejecuta), permitiendo calcular tiempos de respuesta y eficiencia histórica.
 */
@Entity({ name: 'task_assignments' })
export class TaskAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'alert_id', type: 'uuid' })
  alert_id!: string;

  @ManyToOne(() => UrbanAlertEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_id' })
  alert!: UrbanAlertEntity;

  @Index()
  @Column({ name: 'assigned_by_id', type: 'uuid' })
  assigned_by_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy!: UserEntity;

  @Index()
  @Column({ name: 'crew_user_id', type: 'uuid' })
  crew_user_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'crew_user_id' })
  crewUser!: UserEntity;

  @Index()
  @Column({
    type: 'enum',
    enum: UrbanAlertStatus,
    default: UrbanAlertStatus.PENDING,
  })
  status!: UrbanAlertStatus;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assigned_at!: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolved_at!: Date | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolution_notes!: string | null;
}
