import type { Municipality } from '../app.config';
import type { Canal, GeoJsonPosition, LeakAlert } from '../satellite-monitoring/types';
import type { Severity } from '../shared/domain/risk-level';
import type { UrbanAlert } from '../urban-channels/types';

export type IncidentSource = 'SATELLITE' | 'URBAN';

export interface DashboardMetrics {
  canalsMonitored: number;
  satelliteLeaksDetected: number;
  satelliteLeaksCritical: number;
  urbanAlertsTotal: number;
  urbanAlertsCritical: number;
  averageUrbanObstructionPct: number;
  criticalIncidentsTotal: number;
  updatedAt: string;
}

export interface UnifiedIncidentRecord {
  id: string;
  source: IncidentSource;
  sourceLabel: 'Fuga Satelital' | 'Acequia Urbana';
  title: string;
  municipality: Municipality;
  severity: Severity;
  metricLabel: string;
  metricValue: number;
  detectedAt: string;
  details: string;
  location: {
    type: 'Point';
    coordinates: GeoJsonPosition;
  };
}

export interface DashboardMapOverview {
  canals: Canal[];
  satelliteAlerts: LeakAlert[];
  urbanAlerts: UrbanAlert[];
}
