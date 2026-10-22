import { useCallback, useEffect, useState } from 'react';
import type { Municipality } from '../../app.config';
import { ApiError } from '../../shared/api/http-client';
import { urbanApi } from '../services/urban.api';
import type { UrbanAlert, UrbanAnalysisResult } from '../types';

export type AnalysisStatus =
  | { kind: 'idle' }
  | { kind: 'analyzing'; fileName: string }
  | { kind: 'ready'; result: UrbanAnalysisResult }
  | { kind: 'error'; message: string };

export type AlertRegistrationStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; alert: UrbanAlert }
  | { kind: 'error'; message: string };

export function useImageAnalysis() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisStatus>({ kind: 'idle' });
  const [registration, setRegistration] = useState<AlertRegistrationStatus>({ kind: 'idle' });
  const [alerts, setAlerts] = useState<UrbanAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState<boolean>(true);

  useEffect(() => {
    const controller = new AbortController();
    setAlertsLoading(true);
    urbanApi
      .getAlerts(undefined, controller.signal)
      .then((list) => setAlerts(list))
      .catch(() => {
        // Error silencioso en listado inicial
      })
      .finally(() => setAlertsLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const analyzeFile = useCallback(async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });

    setAnalysis({ kind: 'analyzing', fileName: file.name });
    setRegistration({ kind: 'idle' });

    try {
      const result = await urbanApi.analyzeImage(file);
      setAnalysis({ kind: 'ready', result });
    } catch (error) {
      setAnalysis({
        kind: 'error',
        message: error instanceof ApiError ? error.message : 'No se pudo analizar la imagen',
      });
    }
  }, []);

  const registerAlert = useCallback(
    async (input: { municipality: Municipality; address: string; notes?: string }) => {
      if (analysis.kind !== 'ready') return;
      setRegistration({ kind: 'saving' });

      try {
        const created = await urbanApi.createAlert({
          analysisId: analysis.result.analysisId,
          municipality: input.municipality,
          address: input.address,
          obstructionPercentage: analysis.result.obstructionPercentage,
          riskLevel: analysis.result.riskLevel,
          detections: analysis.result.detections,
          notes: input.notes,
        });
        setRegistration({ kind: 'saved', alert: created });
        setAlerts((prev) => [created, ...prev]);
      } catch (error) {
        setRegistration({
          kind: 'error',
          message: error instanceof ApiError ? error.message : 'No se pudo registrar la alerta',
        });
      }
    },
    [analysis],
  );

  const reset = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAnalysis({ kind: 'idle' });
    setRegistration({ kind: 'idle' });
  }, []);

  return {
    previewUrl,
    analysis,
    registration,
    alerts,
    alertsLoading,
    analyzeFile,
    registerAlert,
    reset,
  };
}
