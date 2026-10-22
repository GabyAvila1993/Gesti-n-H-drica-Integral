import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { visionConfig, type VisionConfig } from '../core/config/app.config';
import { UserRole } from '../core/database/entities/user.entity';
import { validateUploadedImage } from '../core/security/image-upload.validator';
import type { VisionImageInput } from '../urban-channels/providers/vision-provider.interface';
import { OperationsService } from './application/operations.service';
import type { AuthTokenPayload } from './domain/operations.types';
import {
  AssignTaskDto,
  CreateStaffUserDto,
  LoginDto,
  ManagerAlertsQueryDto,
  ResolveTaskDto,
} from './dto/operations.dto';
import { CurrentUser, JwtAuthGuard, Roles } from './security/jwt-rbac.guard';

@ApiTags('Operativa Municipal y Roles (RBAC)')
@Controller('operations')
export class OperationsController {
  constructor(
    private readonly service: OperationsService,
    @Inject(visionConfig.KEY) private readonly config: VisionConfig,
  ) {}

  @Get('demo-accounts')
  @ApiOperation({
    summary: 'Listar cuentas municipales preconfiguradas para prueba de roles',
    description:
      'Devuelve el listado de usuarios iniciales por municipio (ADMIN, ENCARGADO y CUADRILLA) para facilitar la evaluación de la Fase 5.',
  })
  @ApiOkResponse({ description: 'Cuentas municipales disponibles.' })
  getDemoAccounts() {
    return this.service.listDemoAccounts();
  }

  @Post('auth/login')
  @ApiOperation({
    summary: 'Iniciar sesión municipal (JWT + bcrypt)',
    description:
      'Autentica a un usuario municipal (ADMIN, ENCARGADO o CUADRILLA) verificando su contraseña con bcrypt y devuelve un token JWT firmado.',
  })
  @ApiCreatedResponse({ description: 'Autenticación exitosa con accessToken JWT y datos del rol.' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas.' })
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @Get('auth/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener perfil del usuario municipal autenticado',
  })
  getProfile(@CurrentUser() user: AuthTokenPayload) {
    return user;
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar personal operativo del municipio (Rol ADMIN)',
    description: 'Lista los usuarios ENCARGADO y CUADRILLA pertenecientes al municipio del Administrador.',
  })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN.' })
  listMunicipalUsers(@CurrentUser() admin: AuthTokenPayload) {
    return this.service.listMunicipalStaff(admin);
  }

  @Post('admin/users')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear usuario ENCARGADO o CUADRILLA (Rol ADMIN)',
    description:
      'Crea un nuevo usuario operativo con contraseña hasheada con bcrypt, vinculado estrictamente al municipio del Administrador autenticado.',
  })
  @ApiCreatedResponse({ description: 'Usuario operativo creado exitosamente.' })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN.' })
  createMunicipalUser(
    @CurrentUser() admin: AuthTokenPayload,
    @Body() dto: CreateStaffUserDto,
  ) {
    return this.service.createMunicipalStaff(admin, dto);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener estadísticas históricas y eficiencia de cuadrillas (Rol ADMIN)',
    description:
      'Calcula el tiempo medio de resolución, ranking de cuadrillas y registro histórico con evidencia fotográfica ("Antes" y "Después") a partir de las alertas cerradas con Soft Delete (`status = RESOLVED`).',
  })
  getAdminStats(@CurrentUser() admin: AuthTokenPayload) {
    return this.service.getAdminStats(admin);
  }

  @Get('manager/overview')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mapa Estratégico y Clustering Adaptativo DBSCAN de Zonas de Trabajo (Rol ENCARGADO)',
    description:
      'Devuelve las alertas pendientes del municipio del Encargado, los clusters de Zona de Trabajo adaptativos (con radio envolvente real y Convex Hull) y las cuadrillas disponibles.',
  })
  getManagerOverview(
    @CurrentUser() manager: AuthTokenPayload,
    @Query() query: ManagerAlertsQueryDto,
  ) {
    return this.service.getManagerStrategicOverview(manager, query.radiusMeters);
  }

  @Post('manager/assignments')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Asignar alerta de acequia a una Cuadrilla (Rol ENCARGADO)',
    description:
      'Vincula una `UrbanAlert` pendiente con el `Encargado` que asigna y la `Cuadrilla` que ejecuta dentro del mismo municipio.',
  })
  assignTask(
    @CurrentUser() manager: AuthTokenPayload,
    @Body() dto: AssignTaskDto,
  ) {
    return this.service.assignTaskToCrew(manager, dto);
  }

  @Get('crew/tasks')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.CUADRILLA)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mapa Táctico: listar tareas asignadas a la Cuadrilla (Rol CUADRILLA)',
    description:
      'Devuelve las alertas asignadas específicamente a la cuadrilla autenticada para su navegación vial y auditoría fotográfica.',
  })
  getCrewTasks(@CurrentUser() crew: AuthTokenPayload) {
    return this.service.getCrewTacticalOverview(crew);
  }

  @Patch('crew/tasks/:alertId/resolve')
  @Post('crew/tasks/:alertId/resolve')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.CUADRILLA)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'evidenceBefore', maxCount: 1 },
      { name: 'evidenceAfter', maxCount: 1 },
    ]),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Acequia Limpia / Cerrar Tarea con Auditoría Fotográfica Obligatoria (Rol CUADRILLA)',
    description:
      'Recibe obligatoriamente 2 fotografías (`evidenceBefore` y `evidenceAfter`), las almacena mediante `StorageService` en `/uploads/crew-evidence/` y marca la alerta como `RESOLVED` (`resolved_at = now()`).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['evidenceBefore', 'evidenceAfter'],
      properties: {
        evidenceBefore: {
          type: 'string',
          format: 'binary',
          description: 'Fotografía obligatoria del estado "Antes" de la limpieza',
        },
        evidenceAfter: {
          type: 'string',
          format: 'binary',
          description: 'Fotografía obligatoria del estado "Después" de la limpieza',
        },
        resolutionNotes: {
          type: 'string',
          description: 'Observaciones operativas del cierre de tarea',
        },
      },
    },
  })
  resolveCrewTask(
    @CurrentUser() crew: AuthTokenPayload,
    @Param('alertId') alertId: string,
    @Body() dto: ResolveTaskDto,
    @UploadedFiles()
    files?: {
      evidenceBefore?: VisionImageInput[];
      evidenceAfter?: VisionImageInput[];
    },
  ) {
    const beforeFile = files?.evidenceBefore?.[0];
    const afterFile = files?.evidenceAfter?.[0];

    if (!beforeFile || !afterFile) {
      throw new BadRequestException(
        'Para cerrar la tarea es obligatorio adjuntar las 2 fotografías de auditoría: "Antes" y "Después" de limpiar la acequia.',
      );
    }

    validateUploadedImage(beforeFile, this.config.uploadMaxSizeMb);
    validateUploadedImage(afterFile, this.config.uploadMaxSizeMb);

    return this.service.resolveCrewTask(crew, alertId, dto, {
      evidenceBefore: beforeFile,
      evidenceAfter: afterFile,
    });
  }
}
