import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../shared/api/http-client';
import { dashboardApi, type DashboardFilterParams } from '../services/dashboard.api';
import type {
  DashboardMapOverview,
  DashboardMetrics,
  UnifiedIncidentRecord,
} from '../types';

export type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      metrics: DashboardMetrics;
      records: UnifiedIncidentRecord[];
      mapOverview: DashboardMapOverview;
    };

export function useDashboard(filters: DashboardFilterParams) {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    Promise.all([
      dashboardApi.getMetrics(filters.municipality, controller.signal),
      dashboardApi.getRecords(filters, controller.signal),
      dashboardApi.getMapOverview(filters.municipality, controller.signal),
    ])
      .then(([metrics, records, mapOverview]) => {
        setState({ status: 'ready', metrics, records, mapOverview });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({
          status: 'error',
          message:
            error instanceof ApiError ? error.message : 'No se pudo cargar el panel central',
        });
      });

    return () => controller.abort();
  }, [filters.municipality, filters.source, filters.severity, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, reload };
}
