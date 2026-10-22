import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '../core/database/entities/user.entity';
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
  constructor(private readonly service: OperationsService) {}

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
      'Calcula el tiempo medio de resolución, ranking de cuadrillas y registro histórico a partir de las alertas cerradas con Soft Delete (`status = RESOLVED`).',
  })
  getAdminStats(@CurrentUser() admin: AuthTokenPayload) {
    return this.service.getAdminStats(admin);
  }

  @Get('manager/overview')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mapa Estratégico y Clustering Dinámico de Zonas Críticas (Rol ENCARGADO)',
    description:
      'Devuelve las alertas pendientes del municipio del Encargado, los clusters de Zona Crítica según el radio en metros (1000m o 200m) y las cuadrillas disponibles.',
  })
  getManagerOverview(
    @CurrentUser() manager: AuthTokenPayload,
    @Query() query: ManagerAlertsQueryDto,
  ) {
    return this.service.getManagerStrategicOverview(
      manager,
      query.radiusMeters ?? 1000,
    );
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
      'Devuelve las alertas asignadas específicamente a la cuadrilla autenticada para su navegación en terreno.',
  })
  getCrewTasks(@CurrentUser() crew: AuthTokenPayload) {
    return this.service.getCrewTacticalOverview(crew);
  }

  @Patch('crew/tasks/:alertId/resolve')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.CUADRILLA)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Acequia Limpia / Cerrar Tarea con Soft Delete (Rol CUADRILLA)',
    description:
      'Marca la alerta y la tarea como `RESOLVED` (`resolved_at = now()`). La alerta desaparece del mapa público pero permanece en la base de datos para las estadísticas del Administrador.',
  })
  resolveCrewTask(
    @CurrentUser() crew: AuthTokenPayload,
    @Param('alertId') alertId: string,
    @Body() dto: ResolveTaskDto,
  ) {
    return this.service.resolveCrewTask(crew, alertId, dto);
  }
}
