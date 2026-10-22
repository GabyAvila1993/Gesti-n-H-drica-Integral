import type { Municipality } from '../../app.config';
import { httpGet, httpPost, httpPostMultipart } from '../../shared/api/http-client';
import type { SamplePhotoPreset } from './sample-photos';
import type {
  CreateUrbanAlertPayload,
  UrbanAlert,
  UrbanAnalysisResult,
} from '../types';

export const urbanApi = {
  analyzeImage: (file: File, presetId?: SamplePhotoPreset['id'], signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('image', file);
    if (presetId) {
      formData.append('presetId', presetId);
    }
    return httpPostMultipart<UrbanAnalysisResult>('/urban/analyze', formData, signal);
  },

  createAlert: (payload: CreateUrbanAlertPayload, signal?: AbortSignal) =>
    httpPost<UrbanAlert, CreateUrbanAlertPayload>('/urban/alerts', payload, signal),

  getAlerts: (municipality?: Municipality, signal?: AbortSignal) => {
    const query = municipality ? `?municipality=${encodeURIComponent(municipality)}` : '';
    return httpGet<UrbanAlert[]>(`/urban/alerts${query}`, signal);
  },
};
