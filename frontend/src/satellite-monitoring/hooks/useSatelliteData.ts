import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../shared/api/http-client';
import { satelliteApi } from '../services/satellite.api';
import type { Canal, LeakAlert } from '../types';

type SatelliteDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; canals: Canal[]; alerts: LeakAlert[] };

/** Carga canales y alertas en paralelo; expone `reload` para reintentar. */
export function useSatelliteData() {
  const [state, setState] = useState<SatelliteDataState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    Promise.all([
      satelliteApi.getCanals(controller.signal),
      satelliteApi.getAlerts(controller.signal),
    ])
      .then(([canals, alerts]) => setState({ status: 'ready', canals, alerts }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({
          status: 'error',
          message: error instanceof ApiError ? error.message : 'Error inesperado',
        });
      });

    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, reload };
}
