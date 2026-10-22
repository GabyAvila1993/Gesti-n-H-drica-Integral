import type { UserRole } from '../../core/database/entities/user.entity';
import type { UrbanMunicipality, UrbanRiskLevel } from '../../urban-channels/domain/risk-level';
import type { UrbanAlert } from '../../urban-channels/domain/urban-alert';

export interface PublicUser {
  readonly id: string;
  readonly username: string;
  readonly role: UserRole;
  readonly municipality: UrbanMunicipality;
  readonly fullName: string;
  readonly createdAt: string;
}

export interface AuthTokenPayload {
  readonly sub: string;
  readonly username: string;
  readonly role: UserRole;
  readonly municipality: UrbanMunicipality;
  readonly fullName: string;
}

export interface LoginResponse {
  readonly accessToken: string;
  readonly user: PublicUser;
}

export interface TaskAssignmentRecord {
  readonly id: string;
  readonly alertId: string;
  readonly assignedById: string;
  readonly assignedByUsername: string;
  readonly assignedByName: string;
  readonly crewUserId: string;
  readonly crewUsername: string;
  readonly crewName: string;
  status: 'PENDING' | 'RESOLVED';
  readonly assignedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  evidenceBeforeUrl?: string;
  evidenceAfterUrl?: string;
}

export interface CriticalZoneCluster {
  readonly id: string;
  readonly center: {
    readonly lat: number;
    readonly lng: number;
  };
  /** Radio exacto en metros del Círculo Envolvente Mínimo que abraza los puntos del cluster. */
  readonly radiusMeters: number;
  /** Diámetro real en metros entre los reportes más distantes dentro de la Zona de Trabajo. */
  readonly spanMeters: number;
  /** Vértices [lat, lng] de la Envolvente Convexa (Convex Hull) de los puntos agrupados. */
  readonly convexHull: Array<[number, number]>;
  readonly alertsCount: number;
  readonly criticalCount: number;
  readonly dominantRisk: UrbanRiskLevel;
  readonly alertIds: string[];
  readonly municipality: UrbanMunicipality;
  readonly label: string;
}

export interface CrewEfficiencyStat {
  readonly crewId: string;
  readonly username: string;
  readonly fullName: string;
  readonly resolvedCount: number;
  readonly pendingCount: number;
  readonly avgResolutionMinutes: number;
}

export interface ResolvedAlertHistoryItem {
  readonly alert: UrbanAlert;
  readonly assignment?: TaskAssignmentRecord;
  readonly resolutionMinutes: number;
}

export interface MunicipalOperationsStats {
  readonly municipality: UrbanMunicipality;
  readonly totalHistoricalAlerts: number;
  readonly pendingAlertsCount: number;
  readonly resolvedAlertsCount: number;
  readonly avgResolutionMinutes: number;
  readonly crewEfficiency: CrewEfficiencyStat[];
  readonly resolvedHistory: ResolvedAlertHistoryItem[];
}

export interface ManagerStrategicOverview {
  readonly municipality: UrbanMunicipality;
  readonly alerts: Array<{
    readonly alert: UrbanAlert;
    readonly assignment?: TaskAssignmentRecord;
  }>;
  readonly clusters: CriticalZoneCluster[];
  readonly crews: PublicUser[];
}

export interface CrewTacticalTaskItem {
  readonly assignment: TaskAssignmentRecord;
  readonly alert: UrbanAlert;
}

export interface CrewTacticalOverview {
  readonly crew: PublicUser;
  readonly pendingTasks: CrewTacticalTaskItem[];
  readonly completedTasks: CrewTacticalTaskItem[];
}
