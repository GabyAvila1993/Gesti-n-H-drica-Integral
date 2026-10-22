import type { Municipality } from '../app.config';
import type { Severity } from '../shared/domain/risk-level';
import type { UrbanAlert } from '../urban-channels/types';

export type UserRole = 'ADMIN' | 'ENCARGADO' | 'CUADRILLA';

export interface PublicUser {
  id: string;
  username: string;
  role: UserRole;
  municipality: Municipality;
  fullName: string;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: PublicUser;
}

export interface TaskAssignmentRecord {
  id: string;
  alertId: string;
  assignedById: string;
  assignedByUsername: string;
  assignedByName: string;
  crewUserId: string;
  crewUsername: string;
  crewName: string;
  status: 'PENDING' | 'RESOLVED';
  assignedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  evidenceBeforeUrl?: string;
  evidenceAfterUrl?: string;
}

export interface CriticalZoneCluster {
  id: string;
  center: {
    lat: number;
    lng: number;
  };
  radiusMeters: number;
  spanMeters: number;
  convexHull: Array<[number, number]>;
  alertsCount: number;
  criticalCount: number;
  dominantRisk: Severity;
  alertIds: string[];
  municipality: Municipality;
  label: string;
}

export interface CrewEfficiencyStat {
  crewId: string;
  username: string;
  fullName: string;
  resolvedCount: number;
  pendingCount: number;
  avgResolutionMinutes: number;
}

export interface ResolvedAlertHistoryItem {
  alert: UrbanAlert;
  assignment?: TaskAssignmentRecord;
  resolutionMinutes: number;
}

export interface MunicipalOperationsStats {
  municipality: Municipality;
  totalHistoricalAlerts: number;
  pendingAlertsCount: number;
  resolvedAlertsCount: number;
  avgResolutionMinutes: number;
  crewEfficiency: CrewEfficiencyStat[];
  resolvedHistory: ResolvedAlertHistoryItem[];
}

export interface ManagerStrategicOverview {
  municipality: Municipality;
  alerts: Array<{
    alert: UrbanAlert;
    assignment?: TaskAssignmentRecord;
  }>;
  clusters: CriticalZoneCluster[];
  crews: PublicUser[];
}

export interface CrewTacticalTaskItem {
  assignment: TaskAssignmentRecord;
  alert: UrbanAlert;
}

export interface CrewTacticalOverview {
  crew: PublicUser;
  pendingTasks: CrewTacticalTaskItem[];
  completedTasks: CrewTacticalTaskItem[];
}
