import { httpGet, httpPatch, httpPost } from '../../shared/api/http-client';
import type {
  CrewTacticalOverview,
  LoginResponse,
  ManagerStrategicOverview,
  MunicipalOperationsStats,
  PublicUser,
  TaskAssignmentRecord,
} from '../types';

export interface CreateStaffUserInput {
  username: string;
  password: string;
  role: 'ENCARGADO' | 'CUADRILLA';
  fullName?: string;
}

export const operationsApi = {
  getDemoAccounts(signal?: AbortSignal): Promise<PublicUser[]> {
    return httpGet<PublicUser[]>('/operations/demo-accounts', signal);
  },

  login(username: string, password: string, signal?: AbortSignal): Promise<LoginResponse> {
    return httpPost<LoginResponse>('/operations/auth/login', { username, password }, signal);
  },

  getAdminUsers(token: string, signal?: AbortSignal): Promise<PublicUser[]> {
    return httpGet<PublicUser[]>('/operations/admin/users', signal, token);
  },

  createStaffUser(
    token: string,
    payload: CreateStaffUserInput,
    signal?: AbortSignal,
  ): Promise<PublicUser> {
    return httpPost<PublicUser, CreateStaffUserInput>(
      '/operations/admin/users',
      payload,
      signal,
      token,
    );
  },

  getAdminStats(token: string, signal?: AbortSignal): Promise<MunicipalOperationsStats> {
    return httpGet<MunicipalOperationsStats>('/operations/admin/stats', signal, token);
  },

  getManagerOverview(
    token: string,
    radiusMeters: number,
    signal?: AbortSignal,
  ): Promise<ManagerStrategicOverview> {
    return httpGet<ManagerStrategicOverview>(
      `/operations/manager/overview?radiusMeters=${radiusMeters}`,
      signal,
      token,
    );
  },

  assignTask(
    token: string,
    alertId: string,
    crewUserId: string,
    signal?: AbortSignal,
  ): Promise<TaskAssignmentRecord> {
    return httpPost<TaskAssignmentRecord>(
      '/operations/manager/assignments',
      { alertId, crewUserId },
      signal,
      token,
    );
  },

  getCrewTasks(token: string, signal?: AbortSignal): Promise<CrewTacticalOverview> {
    return httpGet<CrewTacticalOverview>('/operations/crew/tasks', signal, token);
  },

  resolveCrewTask(
    token: string,
    alertId: string,
    resolutionNotes?: string,
    signal?: AbortSignal,
  ): Promise<{ alertId: string; status: 'RESOLVED'; resolvedAt: string }> {
    return httpPatch<{ alertId: string; status: 'RESOLVED'; resolvedAt: string }>(
      `/operations/crew/tasks/${encodeURIComponent(alertId)}/resolve`,
      { resolutionNotes },
      signal,
      token,
    );
  },
};
