import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../core/database/entities/user.entity';

export const CREATABLE_STAFF_ROLES = [UserRole.ENCARGADO, UserRole.CUADRILLA] as const;

export class LoginDto {
  @ApiProperty({
    description: 'Nombre de usuario municipal (ej. adminCapital, encargadoCapital, cuadrillaCapital1)',
    example: 'adminCapital',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  username!: string;

  @ApiProperty({
    description: 'Contraseña del usuario operativo',
    example: 'mendoza2026',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(120)
  password!: string;
}

export class CreateStaffUserDto {
  @ApiProperty({
    description: 'Nombre de usuario único para el nuevo Encargado o Cuadrilla',
    example: 'cuadrillaCapital3',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  username!: string;

  @ApiProperty({
    description: 'Contraseña inicial (se almacena hasheada con bcrypt)',
    example: 'operativa2026',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password!: string;

  @ApiProperty({
    description: 'Rol operativo a crear dentro del municipio del Administrador',
    enum: CREATABLE_STAFF_ROLES,
    example: UserRole.CUADRILLA,
  })
  @IsIn(CREATABLE_STAFF_ROLES)
  role!: UserRole.ENCARGADO | UserRole.CUADRILLA;

  @ApiPropertyOptional({
    description: 'Nombre completo o identificación de la cuadrilla/encargado',
    example: 'Cuadrilla Hidráulica #3 (Sexta Sección)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  fullName?: string;
}

export class AssignTaskDto {
  @ApiProperty({
    description: 'ID de la alerta urbana pendiente a asignar',
    example: 'urb-seed-6',
  })
  @IsString()
  @MinLength(3)
  alertId!: string;

  @ApiProperty({
    description: 'ID del usuario con rol CUADRILLA del mismo municipio',
    example: '11111111-1111-4111-8111-111111111103',
  })
  @IsString()
  @MinLength(3)
  crewUserId!: string;
}

export class ResolveTaskDto {
  @ApiPropertyOptional({
    description: 'Detalle operativo de la limpieza realizada por la cuadrilla',
    example: 'Acequia desobstruida. Se retiraron plásticos y ramas con camión.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  resolutionNotes?: string;
}

export class ManagerAlertsQueryDto {
  @ApiPropertyOptional({
    description: 'Radio en metros para el clustering dinámico de Zonas Críticas (ej. 1000 o 200)',
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(50)
  @Max(5000)
  radiusMeters?: number;
}
