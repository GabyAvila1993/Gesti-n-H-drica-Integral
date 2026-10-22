import { httpGet } from '../../shared/api/http-client';
import type { Canal, LeakAlert } from '../types';

export const satelliteApi = {
  getCanals: (signal?: AbortSignal) => httpGet<Canal[]>('/satellite/canals', signal),
  getAlerts: (signal?: AbortSignal) => httpGet<LeakAlert[]>('/satellite/alerts', signal),
};
