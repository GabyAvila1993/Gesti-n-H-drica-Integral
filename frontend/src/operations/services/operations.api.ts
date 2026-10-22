import { httpGet, httpPost, httpPostMultipart } from '../../shared/api/http-client';
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

export interface ResolveCrewTaskInput {
  alertId: string;
  evidenceBefore: File;
  evidenceAfter: File;
  resolutionNotes?: string;
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
    epsMeters?: number,
    signal?: AbortSignal,
  ): Promise<ManagerStrategicOverview> {
    const query = epsMeters ? `?radiusMeters=${epsMeters}` : '';
    return httpGet<ManagerStrategicOverview>(
      `/operations/manager/overview${query}`,
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
    input: ResolveCrewTaskInput,
    signal?: AbortSignal,
  ): Promise<{
    alertId: string;
    status: 'RESOLVED';
    resolvedAt: string;
    evidenceBeforeUrl: string;
    evidenceAfterUrl: string;
  }> {
    const formData = new FormData();
    formData.append('evidenceBefore', input.evidenceBefore);
    formData.append('evidenceAfter', input.evidenceAfter);
    if (input.resolutionNotes && input.resolutionNotes.trim().length > 0) {
      formData.append('resolutionNotes', input.resolutionNotes.trim());
    }

    return httpPostMultipart(
      `/operations/crew/tasks/${encodeURIComponent(input.alertId)}/resolve`,
      formData,
      signal,
      token,
    );
  },
};
