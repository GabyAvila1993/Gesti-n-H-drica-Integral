import { useEffect, useState } from 'react';
import { appConfig } from '../../app.config';
import { httpGet } from './http-client';

export interface HealthStatus {
  status: 'ok';
  appName: string;
  satelliteProvider: string;
  visionProvider: string;
  timestamp: string;
}

export type BackendState =
  | { kind: 'checking' }
  | { kind: 'online'; health: HealthStatus }
  | { kind: 'offline' };

/** Consulta periódicamente GET /health para mostrar el estado de la API. */
export function useBackendHealth(): BackendState {
  const [state, setState] = useState<BackendState>({ kind: 'checking' });

  useEffect(() => {
    const controller = new AbortController();

    const check = () =>
      httpGet<HealthStatus>('/health', controller.signal)
        .then((health) => setState({ kind: 'online', health }))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setState({ kind: 'offline' });
        });

    void check();
    const interval = window.setInterval(check, appConfig.api.healthPollMs);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  return state;
}
