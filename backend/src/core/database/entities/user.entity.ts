import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { UrbanMunicipality } from '../../../urban-channels/domain/risk-level';

export enum UserRole {
  ADMIN = 'ADMIN',
  ENCARGADO = 'ENCARGADO',
  CUADRILLA = 'CUADRILLA',
}

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  municipality!: UrbanMunicipality;

  @Column({ name: 'full_name', type: 'varchar', length: 140, nullable: true })
  fullName!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
