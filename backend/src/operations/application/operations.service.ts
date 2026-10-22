import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DataSource, EntityManager } from 'typeorm';
import { authConfig, type AuthConfig } from '../../core/config/app.config';
import { POSTGRES_DATA_SOURCE } from '../../core/database/database.module';
import { TaskAssignmentEntity } from '../../core/database/entities/task-assignment.entity';
import { UrbanAlertStatus } from '../../core/database/entities/urban-alert.entity';
import { UserEntity, UserRole } from '../../core/database/entities/user.entity';
import { StorageService } from '../../core/storage/storage.service';
import { UrbanAnalysisService } from '../../urban-channels/application/urban-analysis.service';
import type { UrbanMunicipality } from '../../urban-channels/domain/risk-level';
import type { VisionImageInput } from '../../urban-channels/providers/vision-provider.interface';
import type {
  AuthTokenPayload,
  CrewEfficiencyStat,
  CrewTacticalOverview,
  DailyResolvedTaskHistoryItem,
  LoginResponse,
  ManagerStrategicOverview,
  MunicipalOperationsStats,
  PublicUser,
  TaskAssignmentRecord,
} from '../domain/operations.types';
import type {
  AssignTaskDto,
  CreateStaffUserDto,
  LoginDto,
  ResolveTaskDto,
} from '../dto/operations.dto';
import { computeCriticalZoneClusters } from './spatial-clustering';

interface OperationsSeedJson {
  readonly defaultPasswordPlain: string;
  readonly seedUsers: Array<{
    readonly id: string;
    readonly username: string;
    readonly role: 'ADMIN' | 'ENCARGADO' | 'CUADRILLA';
    readonly municipality: UrbanMunicipality;
    readonly fullName: string;
  }>;
  readonly seedAssignments: Array<{
    readonly id: string;
    readonly alertId: string;
    readonly assignedByUsername: string;
    readonly crewUsername: string;
    readonly status: 'PENDING' | 'RESOLVED';
    readonly assignedMinutesAgo: number;
    readonly resolvedMinutesAgo?: number;
    readonly resolutionNotes?: string;
    readonly evidenceBeforeUrl?: string;
    readonly evidenceAfterUrl?: string;
  }>;
}

interface InternalUserRecord extends PublicUser {
  readonly passwordHash: string;
}

function resolveOperationsDatasetPath(): string {
  const adjacentPath = join(__dirname, '..', 'data', 'mendoza-operations.mock.json');
  if (existsSync(adjacentPath)) {
    return adjacentPath;
  }
  return join(process.cwd(), 'src', 'operations', 'data', 'mendoza-operations.mock.json');
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class OperationsService {
  private readonly logger = new Logger(OperationsService.name);
  private users: InternalUserRecord[] | null = null;
  private assignments: TaskAssignmentRecord[] | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly urbanService: UrbanAnalysisService,
    private readonly storageService: StorageService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
    @Inject(POSTGRES_DATA_SOURCE) private readonly dataSource: DataSource | null,
  ) {}

  private async ensureInitialized(): Promise<{
    users: InternalUserRecord[];
    assignments: TaskAssignmentRecord[];
  }> {
    if (this.users && this.assignments) {
      return { users: this.users, assignments: this.assignments };
    }

    if (!this.initPromise) {
      this.initPromise = this.initializeSeedData();
    }
    await this.initPromise;

    return { users: this.users!, assignments: this.assignments! };
  }

  private async initializeSeedData(): Promise<void> {
    const raw = await readFile(resolveOperationsDatasetPath(), 'utf-8');
    const dataset = JSON.parse(raw) as OperationsSeedJson;
    const allAlerts = await this.urbanService.getAllAlertsIncludingResolved();

    const defaultHash = await bcrypt.hash(
      dataset.defaultPasswordPlain,
      this.config.bcryptSaltRounds,
    );
    const now = Date.now();

    const seededUsers: InternalUserRecord[] = dataset.seedUsers.map((u) => ({
      id: u.id,
      username: u.username,
      passwordHash: defaultHash,
      role: u.role as UserRole,
      municipality: u.municipality,
      fullName: u.fullName,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 14).toISOString(),
    }));

    if (this.dataSource && this.dataSource.isInitialized) {
      const userRepo = this.dataSource.getRepository(UserEntity);
      const existingUsers = await userRepo.count();
      if (existingUsers === 0) {
        for (const seed of seededUsers) {
          const entity = userRepo.create({
            id: seed.id,
            username: seed.username,
            password: seed.passwordHash,
            role: seed.role,
            municipality: seed.municipality,
            fullName: seed.fullName,
          });
          await userRepo.save(entity);
        }
      } else {
        const dbUsers = await userRepo.find({ order: { created_at: 'ASC' } });
        this.users = dbUsers.map((u) => ({
          id: u.id,
          username: u.username,
          passwordHash: u.password,
          role: u.role,
          municipality: u.municipality,
          fullName: u.fullName ?? u.username,
          createdAt: u.created_at.toISOString(),
        }));
      }
    }

    if (!this.users) {
      this.users = seededUsers;
    }

    const userByUsername = new Map(this.users.map((u) => [u.username, u]));
    const userById = new Map(this.users.map((u) => [u.id, u]));

    const seededAssignments: TaskAssignmentRecord[] = [];
    for (const item of dataset.seedAssignments) {
      const assignedBy = userByUsername.get(item.assignedByUsername);
      const crew = userByUsername.get(item.crewUsername);
      if (!assignedBy || !crew) continue;

      const expectedAnalysisId = item.alertId.replace('urb-seed-', 'seed-analysis-');
      const matchedAlert = allAlerts.find(
        (a) => a.id === item.alertId || a.analysisId === expectedAnalysisId,
      );
      const resolvedAlertId = matchedAlert ? matchedAlert.id : item.alertId;

      seededAssignments.push({
        id: item.id,
        alertId: resolvedAlertId,
        assignedById: assignedBy.id,
        assignedByUsername: assignedBy.username,
        assignedByName: assignedBy.fullName,
        crewUserId: crew.id,
        crewUsername: crew.username,
        crewName: crew.fullName,
        status: item.status,
        assignedAt: new Date(now - 1000 * 60 * item.assignedMinutesAgo).toISOString(),
        resolvedAt:
          item.resolvedMinutesAgo !== undefined
            ? new Date(now - 1000 * 60 * item.resolvedMinutesAgo).toISOString()
            : undefined,
        resolutionNotes: item.resolutionNotes,
        evidenceBeforeUrl: item.evidenceBeforeUrl,
        evidenceAfterUrl: item.evidenceAfterUrl,
      });
    }

    if (this.dataSource && this.dataSource.isInitialized) {
      const assignRepo = this.dataSource.getRepository(TaskAssignmentEntity);
      const dbAssignments = await assignRepo
        .find({ order: { assigned_at: 'DESC' } })
        .catch(() => []);

      if (dbAssignments.length > 0) {
        const fromDb: TaskAssignmentRecord[] = [];
        for (const row of dbAssignments) {
          const assignedBy = userById.get(row.assigned_by_id);
          const crew = userById.get(row.crew_user_id);
          if (!assignedBy || !crew) continue;

          fromDb.push({
            id: row.id,
            alertId: row.alert_id,
            assignedById: assignedBy.id,
            assignedByUsername: assignedBy.username,
            assignedByName: assignedBy.fullName,
            crewUserId: crew.id,
            crewUsername: crew.username,
            crewName: crew.fullName,
            status: row.status === UrbanAlertStatus.RESOLVED ? 'RESOLVED' : 'PENDING',
            assignedAt: row.assigned_at.toISOString(),
            resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : undefined,
            resolutionNotes: row.resolution_notes ?? undefined,
            evidenceBeforeUrl: row.evidence_before_url ?? undefined,
            evidenceAfterUrl: row.evidence_after_url ?? undefined,
          });
        }

        // Combinar las asignaciones de la base con las semilla que aún no estén en DB
        const existingAlertIds = new Set(fromDb.map((a) => a.alertId));
        for (const seed of seededAssignments) {
          if (!existingAlertIds.has(seed.alertId)) {
            fromDb.push(seed);
          }
        }
        this.assignments = fromDb;
        return;
      }
    }

    this.assignments = seededAssignments;
  }

  private toPublicUser(user: InternalUserRecord): PublicUser {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      municipality: user.municipality,
      fullName: user.fullName,
      createdAt: user.createdAt,
    };
  }

  async listDemoAccounts(): Promise<PublicUser[]> {
    const { users } = await this.ensureInitialized();
    return users.map((u) => this.toPublicUser(u));
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const { users } = await this.ensureInitialized();
    const cleanUsername = dto.username.trim();
    const user = users.find((u) => u.username.toLowerCase() === cleanUsername.toLowerCase());

    if (!user) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    const payload: AuthTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      municipality: user.municipality,
      fullName: user.fullName,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: this.toPublicUser(user),
    };
  }

  async listMunicipalStaff(admin: AuthTokenPayload): Promise<PublicUser[]> {
    const { users } = await this.ensureInitialized();
    return users
      .filter((u) => u.municipality === admin.municipality)
      .map((u) => this.toPublicUser(u));
  }

  /**
   * Vista ADMIN: Crea usuarios de tipo ENCARGADO o CUADRILLA estrictamente limitados
   * al propio municipio del Administrador autenticado.
   */
  async createMunicipalStaff(
    admin: AuthTokenPayload,
    dto: CreateStaffUserDto,
  ): Promise<PublicUser> {
    if (admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo el Administrador municipal puede dar de alta personal.');
    }

    const { users } = await this.ensureInitialized();
    const cleanUsername = dto.username.trim();

    const exists = users.some(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase(),
    );
    if (exists) {
      throw new ConflictException(`El nombre de usuario "${cleanUsername}" ya está registrado.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, this.config.bcryptSaltRounds);
    const fullName =
      dto.fullName?.trim() ||
      `${dto.role === UserRole.ENCARGADO ? 'Encargado' : 'Cuadrilla'} · ${cleanUsername} (${admin.municipality})`;

    let newUserId: string = randomUUID();

    if (this.dataSource && this.dataSource.isInitialized) {
      const repo = this.dataSource.getRepository(UserEntity);
      const entity = repo.create({
        username: cleanUsername,
        password: passwordHash,
        role: dto.role,
        municipality: admin.municipality,
        fullName,
      });
      const saved = await repo.save(entity);
      newUserId = saved.id;
    }

    const record: InternalUserRecord = {
      id: newUserId,
      username: cleanUsername,
      passwordHash,
      role: dto.role,
      municipality: admin.municipality,
      fullName,
      createdAt: new Date().toISOString(),
    };

    users.push(record);
    return this.toPublicUser(record);
  }

  /**
   * Vista ADMIN: Calcula las estadísticas históricas del municipio usando las alertas con
   * Soft Delete (`status = 'RESOLVED'`) y las asignaciones de cuadrillas (`TaskAssignment`).
   */
  async getAdminStats(admin: AuthTokenPayload): Promise<MunicipalOperationsStats> {
    const { users, assignments } = await this.ensureInitialized();
    const municipalAlerts = await this.urbanService.getAllAlertsIncludingResolved(
      admin.municipality,
    );

    const pendingAlerts = municipalAlerts.filter((a) => a.status === 'PENDING');
    const resolvedAlerts = municipalAlerts.filter((a) => a.status === 'RESOLVED');

    const assignmentByAlert = new Map<string, TaskAssignmentRecord>();
    for (const assignment of assignments) {
      assignmentByAlert.set(assignment.alertId, assignment);
    }

    const resolvedHistory = resolvedAlerts.map((alert) => {
      const assignment = assignmentByAlert.get(alert.id);
      const startIso = assignment?.assignedAt ?? alert.createdAt;
      const endIso = alert.resolvedAt ?? assignment?.resolvedAt ?? alert.createdAt;
      const diffMinutes = Math.max(
        5,
        Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000),
      );
      return {
        alert,
        assignment,
        resolutionMinutes: diffMinutes,
      };
    });

    const totalResolutionMinutes = resolvedHistory.reduce(
      (acc, item) => acc + item.resolutionMinutes,
      0,
    );
    const avgResolutionMinutes =
      resolvedHistory.length > 0
        ? Math.round(totalResolutionMinutes / resolvedHistory.length)
        : 0;

    const municipalCrews = users.filter(
      (u) => u.municipality === admin.municipality && u.role === UserRole.CUADRILLA,
    );

    const crewEfficiency: CrewEfficiencyStat[] = municipalCrews.map((crew) => {
      const crewAssignments = assignments.filter((a) => a.crewUserId === crew.id);
      const pendingCount = crewAssignments.filter((a) => a.status === 'PENDING').length;
      const resolvedForCrew = resolvedHistory.filter(
        (h) => h.assignment?.crewUserId === crew.id,
      );
      const crewAvgMinutes =
        resolvedForCrew.length > 0
          ? Math.round(
              resolvedForCrew.reduce((acc, item) => acc + item.resolutionMinutes, 0) /
                resolvedForCrew.length,
            )
          : 0;

      return {
        crewId: crew.id,
        username: crew.username,
        fullName: crew.fullName,
        resolvedCount: resolvedForCrew.length,
        pendingCount,
        avgResolutionMinutes: crewAvgMinutes,
      };
    });

    crewEfficiency.sort((a, b) => {
      if (b.resolvedCount !== a.resolvedCount) return b.resolvedCount - a.resolvedCount;
      return (a.avgResolutionMinutes || 9999) - (b.avgResolutionMinutes || 9999);
    });

    return {
      municipality: admin.municipality,
      totalHistoricalAlerts: municipalAlerts.length,
      pendingAlertsCount: pendingAlerts.length,
      resolvedAlertsCount: resolvedAlerts.length,
      avgResolutionMinutes,
      crewEfficiency,
      resolvedHistory,
    };
  }

  /**
   * Vista ENCARGADO: Obtiene los reportes pendientes de su municipio, el clustering adaptativo
   * (DBSCAN + Círculo Envolvente Mínimo y Convex Hull) y las cuadrillas disponibles.
   */
  async getManagerStrategicOverview(
    manager: AuthTokenPayload,
    epsMeters?: number,
  ): Promise<ManagerStrategicOverview> {
    const { users, assignments } = await this.ensureInitialized();
    const pendingAlerts = await this.urbanService.getAlerts({
      municipality: manager.municipality,
    });

    const activeAssignmentByAlert = new Map<string, TaskAssignmentRecord>();
    for (const assignment of assignments) {
      if (assignment.status === 'PENDING') {
        activeAssignmentByAlert.set(assignment.alertId, assignment);
      }
    }

    const clusters = computeCriticalZoneClusters(pendingAlerts, epsMeters);
    const crews = users
      .filter((u) => u.municipality === manager.municipality && u.role === UserRole.CUADRILLA)
      .map((u) => this.toPublicUser(u));

    return {
      municipality: manager.municipality,
      alerts: pendingAlerts.map((alert) => ({
        alert,
        assignment: activeAssignmentByAlert.get(alert.id),
      })),
      clusters,
      crews,
    };
  }

  /**
   * Vista ENCARGADO: Asigna un reporte de su municipio a una Cuadrilla de su municipio.
   */
  async assignTaskToCrew(
    manager: AuthTokenPayload,
    dto: AssignTaskDto,
  ): Promise<TaskAssignmentRecord> {
    const { users, assignments } = await this.ensureInitialized();
    const alert = await this.urbanService.findAlertById(dto.alertId);
    if (!alert) {
      throw new NotFoundException(`No existe el reporte urbano ${dto.alertId}.`);
    }
    if (alert.municipality !== manager.municipality) {
      throw new ForbiddenException(
        `Solo podés asignar reportes correspondientes al municipio ${manager.municipality}.`,
      );
    }
    if (alert.status === 'RESOLVED') {
      throw new BadRequestException('Este reporte ya fue resuelto y cerrado.');
    }

    const crew = users.find(
      (u) => u.id === dto.crewUserId && u.role === UserRole.CUADRILLA,
    );
    if (!crew) {
      throw new NotFoundException('La cuadrilla seleccionada no existe.');
    }
    if (crew.municipality !== manager.municipality) {
      throw new ForbiddenException(
        `La cuadrilla seleccionada no pertenece al municipio ${manager.municipality}.`,
      );
    }

    let assignment = assignments.find(
      (a) => a.alertId === alert.id && a.status === 'PENDING',
    );

    const nowIso = new Date().toISOString();

    if (assignment) {
      const idx = assignments.indexOf(assignment);
      assignment = {
        ...assignment,
        assignedById: manager.sub,
        assignedByUsername: manager.username,
        assignedByName: manager.fullName,
        crewUserId: crew.id,
        crewUsername: crew.username,
        crewName: crew.fullName,
        assignedAt: nowIso,
      };
      assignments[idx] = assignment;
    } else {
      let newId: string = randomUUID();
      if (this.dataSource && this.dataSource.isInitialized) {
        const repo = this.dataSource.getRepository(TaskAssignmentEntity);
        const entity = repo.create({
          alert_id: alert.id,
          assigned_by_id: manager.sub,
          crew_user_id: crew.id,
          status: UrbanAlertStatus.PENDING,
        });
        const saved = await repo.save(entity).catch(() => null);
        if (saved) newId = saved.id;
      }

      assignment = {
        id: newId,
        alertId: alert.id,
        assignedById: manager.sub,
        assignedByUsername: manager.username,
        assignedByName: manager.fullName,
        crewUserId: crew.id,
        crewUsername: crew.username,
        crewName: crew.fullName,
        status: 'PENDING',
        assignedAt: nowIso,
      };
      assignments.unshift(assignment);
    }

    return assignment;
  }

  /**
   * Vista CUADRILLA: Obtiene únicamente las tareas asignadas a la cuadrilla autenticada.
   */
  async getCrewTacticalOverview(crewPayload: AuthTokenPayload): Promise<CrewTacticalOverview> {
    const { users, assignments } = await this.ensureInitialized();
    const crewUser = users.find((u) => u.id === crewPayload.sub);
    if (!crewUser) {
      throw new UnauthorizedException('Usuario de cuadrilla no encontrado.');
    }

    const allMunicipalAlerts = await this.urbanService.getAllAlertsIncludingResolved(
      crewUser.municipality,
    );
    const alertById = new Map(allMunicipalAlerts.map((a) => [a.id, a]));

    const myAssignments = assignments.filter((a) => a.crewUserId === crewUser.id);
    const pendingTasks = [];
    const completedTasks = [];

    for (const assignment of myAssignments) {
      const alert = alertById.get(assignment.alertId);
      if (!alert) continue;

      if (assignment.status === 'PENDING' && alert.status === 'PENDING') {
        pendingTasks.push({ assignment, alert });
      } else {
        completedTasks.push({ assignment, alert });
      }
    }

    return {
      crew: this.toPublicUser(crewUser),
      pendingTasks,
      completedTasks,
    };
  }

  /**
   * Vista CUADRILLA: "Acequia Limpia / Cerrar Tarea" -> Exige obligatoriamente las 2 fotos
   * de auditoría ("Antes" y "Después"), las guarda mediante `StorageService` en `/uploads/crew-evidence/`
   * y pasa el reporte a estado `RESOLVED` (Soft Delete lógico).
   */
  async resolveCrewTask(
    crewPayload: AuthTokenPayload,
    taskOrAlertId: string,
    dto: ResolveTaskDto,
    files: {
      evidenceBefore?: VisionImageInput;
      evidenceAfter?: VisionImageInput;
    },
  ): Promise<{
    alertId: string;
    status: 'RESOLVED';
    resolvedAt: string;
    evidenceBeforeUrl: string;
    evidenceAfterUrl: string;
  }> {
    const beforeUrl = files.evidenceBefore
      ? undefined
      : this.validateEvidenceUrl(dto.evidenceBeforeUrl, 'Antes');
    const afterUrl = files.evidenceAfter
      ? undefined
      : this.validateEvidenceUrl(dto.evidenceAfterUrl, 'Después');

    if ((!files.evidenceBefore && !beforeUrl) || (!files.evidenceAfter && !afterUrl)) {
      throw new BadRequestException(
        'Es obligatorio subir las 2 fotos de auditoría ("Antes" y "Después") para cerrar la tarea.',
      );
    }

    const { users, assignments } = await this.ensureInitialized();
    const actor = users.find((user) => user.id === crewPayload.sub);
    if (!actor) {
      throw new UnauthorizedException('Usuario operativo no encontrado.');
    }

    const assignment = assignments.find((a) => {
      if ((a.alertId !== taskOrAlertId && a.id !== taskOrAlertId) || a.status !== 'PENDING') {
        return false;
      }
      if (actor.role === UserRole.CUADRILLA) {
        return a.crewUserId === actor.id;
      }
      return actor.role === UserRole.ENCARGADO || actor.role === UserRole.ADMIN;
    });
    if (!assignment) {
      throw new ForbiddenException(
        'No tenés permiso para cerrar esta tarea o no se encuentra asignada activamente.',
      );
    }

    const alert = await this.urbanService.findAlertById(assignment.alertId);
    if (!alert || alert.municipality !== actor.municipality) {
      throw new ForbiddenException('La tarea no pertenece a tu municipio.');
    }

    const [savedBefore, savedAfter] = await Promise.all([
      files.evidenceBefore
        ? this.storageService.saveImage({
            buffer: files.evidenceBefore.buffer,
            originalname: files.evidenceBefore.originalname,
            mimetype: files.evidenceBefore.mimetype,
            folder: 'crew-evidence',
          })
        : Promise.resolve(null),
      files.evidenceAfter
        ? this.storageService.saveImage({
            buffer: files.evidenceAfter.buffer,
            originalname: files.evidenceAfter.originalname,
            mimetype: files.evidenceAfter.mimetype,
            folder: 'crew-evidence',
          })
        : Promise.resolve(null),
    ]);
    const evidenceBeforeUrl = savedBefore?.url ?? beforeUrl!;
    const evidenceAfterUrl = savedAfter?.url ?? afterUrl!;

    const resolutionText =
      dto.resolutionNotes?.trim() ||
      'Limpieza de cauce completada por cuadrilla municipal.';
    const resolvedAt = new Date().toISOString();

    if (this.dataSource && this.dataSource.isInitialized) {
      const previousAlertState = {
        status: alert.status,
        resolvedAt: alert.resolvedAt,
        notes: alert.notes,
        evidenceBeforeUrl: alert.evidenceBeforeUrl,
        evidenceAfterUrl: alert.evidenceAfterUrl,
      };
      try {
        await this.dataSource.transaction(async (manager) => {
          await this.persistResolvedAssignment(
            manager,
            assignment,
            resolvedAt,
            resolutionText,
            evidenceBeforeUrl,
            evidenceAfterUrl,
          );
          await this.urbanService.markAlertResolved(
            assignment.alertId,
            {
              resolutionNotes: resolutionText,
              evidenceBeforeUrl,
              evidenceAfterUrl,
              resolvedAt,
            },
            manager,
          );
        });
      } catch (error) {
        this.logger.error(
          `No se pudo persistir el cierre de la tarea ${assignment.alertId}.`,
          error instanceof Error ? error.stack : String(error),
        );
        alert.status = previousAlertState.status;
        alert.resolvedAt = previousAlertState.resolvedAt;
        alert.notes = previousAlertState.notes;
        alert.evidenceBeforeUrl = previousAlertState.evidenceBeforeUrl;
        alert.evidenceAfterUrl = previousAlertState.evidenceAfterUrl;
        const cleanupResults = await Promise.allSettled(
          [savedBefore, savedAfter]
            .filter((file): file is NonNullable<typeof file> => file !== null)
            .map((file) => this.storageService.deleteImage(file.key)),
        );
        for (const cleanup of cleanupResults) {
          if (cleanup.status === 'rejected') {
            this.logger.error(
              `No se pudo eliminar una evidencia subida para la tarea ${assignment.alertId}.`,
              cleanup.reason instanceof Error
                ? cleanup.reason.stack
                : String(cleanup.reason),
            );
          }
        }
        throw new InternalServerErrorException(
          'No se pudo guardar el cierre de la tarea. No se confirmó la resolución.',
          { cause: error },
        );
      }
    } else {
      await this.urbanService.markAlertResolved(assignment.alertId, {
        resolutionNotes: resolutionText,
        evidenceBeforeUrl,
        evidenceAfterUrl,
        resolvedAt,
      });
    }

    assignment.status = 'RESOLVED';
    assignment.resolvedAt = resolvedAt;
    assignment.resolutionNotes = resolutionText;
    assignment.evidenceBeforeUrl = evidenceBeforeUrl;
    assignment.evidenceAfterUrl = evidenceAfterUrl;

    return {
      alertId: assignment.alertId,
      status: 'RESOLVED',
      resolvedAt,
      evidenceBeforeUrl,
      evidenceAfterUrl,
    };
  }

  private validateEvidenceUrl(value: string | undefined, label: string): string | undefined {
    const url = value?.trim();
    if (!url) return undefined;

    const isLocalUpload = url.startsWith('/uploads/') && !url.includes('..') && !url.includes('\\');
    let isHttpUrl = false;
    try {
      const parsed = new URL(url);
      isHttpUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      isHttpUrl = false;
    }
    if (!isLocalUpload && !isHttpUrl) {
      throw new BadRequestException(`La URL de evidencia "${label}" no es válida.`);
    }
    return url;
  }

  private async persistResolvedAssignment(
    manager: EntityManager,
    assignment: TaskAssignmentRecord,
    resolvedAt: string,
    resolutionNotes: string,
    evidenceBeforeUrl: string,
    evidenceAfterUrl: string,
  ): Promise<void> {
    const repository = manager.getRepository(TaskAssignmentEntity);
    const existing = UUID_REGEX.test(assignment.id)
      ? await repository.findOne({ where: { id: assignment.id } })
      : await repository.findOne({ where: { alert_id: assignment.alertId } });

    if (existing) {
      existing.status = UrbanAlertStatus.RESOLVED;
      existing.resolved_at = new Date(resolvedAt);
      existing.resolution_notes = resolutionNotes;
      existing.evidence_before_url = evidenceBeforeUrl;
      existing.evidence_after_url = evidenceAfterUrl;
      await repository.save(existing);
      return;
    }

    if (
      !UUID_REGEX.test(assignment.alertId) ||
      !UUID_REGEX.test(assignment.assignedById) ||
      !UUID_REGEX.test(assignment.crewUserId)
    ) {
      throw new Error('La tarea no tiene identificadores válidos para persistir en la base de datos.');
    }

    const created = repository.create({
      alert_id: assignment.alertId,
      assigned_by_id: assignment.assignedById,
      crew_user_id: assignment.crewUserId,
      status: UrbanAlertStatus.RESOLVED,
      resolved_at: new Date(resolvedAt),
      resolution_notes: resolutionNotes,
      evidence_before_url: evidenceBeforeUrl,
      evidence_after_url: evidenceAfterUrl,
    });
    await repository.save(created);
  }

  /**
   * Historial de tareas resueltas para el usuario autenticado, limitado a 24 horas.
   */
  async getCrewTasksHistory(
    userPayload: AuthTokenPayload,
  ): Promise<DailyResolvedTaskHistoryItem[]> {
    const { users, assignments } = await this.ensureInitialized();
    const user = users.find((u) => u.id === userPayload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario operativo no encontrado.');
    }

    const allMunicipalAlerts = await this.urbanService.getAllAlertsIncludingResolved(
      user.municipality,
    );
    const alertById = new Map(allMunicipalAlerts.map((a) => [a.id, a]));
    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;

    const filteredAssignments = assignments.filter((a) => {
      if (a.status !== 'RESOLVED' || !a.resolvedAt) return false;
      const resolvedTimeMs = new Date(a.resolvedAt).getTime();
      if (Number.isNaN(resolvedTimeMs) || resolvedTimeMs < cutoffMs) {
        return false;
      }

      if (user.role === UserRole.CUADRILLA) {
        return a.crewUserId === user.id;
      }
      if (user.role === UserRole.ENCARGADO) {
        return a.assignedById === user.id;
      }
      return user.role === UserRole.ADMIN;
    });

    const history: DailyResolvedTaskHistoryItem[] = [];
    for (const assignment of filteredAssignments) {
      const alert = alertById.get(assignment.alertId);
      if (!alert) continue;

      history.push({
        id: assignment.id,
        alertId: alert.id,
        address: alert.address,
        municipality: alert.municipality,
        riskLevel: alert.riskLevel,
        obstructionPercentage: alert.obstructionPercentage,
        status: 'RESOLVED',
        resolvedAt: assignment.resolvedAt!,
        resolutionNotes: assignment.resolutionNotes ?? alert.notes ?? '',
        crewUserId: assignment.crewUserId,
        crewName: assignment.crewName,
        assignedById: assignment.assignedById,
        assignedByName: assignment.assignedByName,
        evidenceBeforeUrl: assignment.evidenceBeforeUrl ?? alert.evidenceBeforeUrl,
        evidenceAfterUrl: assignment.evidenceAfterUrl ?? alert.evidenceAfterUrl,
      });
    }

    return history.sort(
      (a, b) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime(),
    );
  }
}
