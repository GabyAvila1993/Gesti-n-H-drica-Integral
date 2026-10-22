import type { Municipality } from '../../app.config';
import { httpGet } from '../../shared/api/http-client';
import type { Severity } from '../../shared/domain/risk-level';
import type {
  DashboardMapOverview,
  DashboardMetrics,
  IncidentSource,
  UnifiedIncidentRecord,
} from '../types';

export interface DashboardFilterParams {
  municipality?: Municipality;
  source?: IncidentSource;
  severity?: Severity;
}

function buildQuery(params: DashboardFilterParams): string {
  const search = new URLSearchParams();
  if (params.municipality) search.set('municipality', params.municipality);
  if (params.source) search.set('source', params.source);
  if (params.severity) search.set('severity', params.severity);
  const str = search.toString();
  return str ? `?${str}` : '';
}

export const dashboardApi = {
  getMetrics: (municipality?: Municipality, signal?: AbortSignal) =>
    httpGet<DashboardMetrics>(`/dashboard/metrics${buildQuery({ municipality })}`, signal),

  getRecords: (params: DashboardFilterParams = {}, signal?: AbortSignal) =>
    httpGet<UnifiedIncidentRecord[]>(`/dashboard/records${buildQuery(params)}`, signal),

  getMapOverview: (municipality?: Municipality, signal?: AbortSignal) =>
    httpGet<DashboardMapOverview>(`/dashboard/map${buildQuery({ municipality })}`, signal),
};
