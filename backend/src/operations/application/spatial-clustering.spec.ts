import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { UrbanAlert } from '../../urban-channels/domain/urban-alert';
import { computeCriticalZoneClusters, haversineDistanceMeters } from './spatial-clustering';

function makeAlert(
  id: string,
  lat: number,
  lng: number,
  riskLevel: 'BAJO' | 'MEDIO' | 'CRITICO' = 'CRITICO',
): UrbanAlert {
  return {
    id,
    analysisId: `an-${id}`,
    municipality: 'Capital',
    address: `Calle ${id}`,
    obstructionPercentage: 85,
    riskLevel,
    detectionsCount: 2,
    detections: [],
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    location: {
      type: 'Point',
      coordinates: [lng, lat],
    },
  };
}

describe('spatial-clustering (Zonas Críticas dinámicas)', () => {
  it('calcula correctamente la distancia geodésica en metros entre dos puntos de Capital', () => {
    const p1 = { lat: -32.8884, lng: -68.8562 };
    const p2 = { lat: -32.8888, lng: -68.8576 };
    const dist = haversineDistanceMeters(p1, p2);
    assert.ok(dist > 100 && dist < 200, `Distancia esperada ~140m, obtenida: ${dist}m`);
  });

  it('agrupa reportes cercanos dentro de una Zona Crítica en radio de 200m y 1000m', () => {
    const alerts: UrbanAlert[] = [
      makeAlert('a1', -32.8884, -68.8562, 'CRITICO'),
      makeAlert('a2', -32.8888, -68.8576, 'CRITICO'),
      makeAlert('a3', -32.8902, -68.8531, 'MEDIO'),
    ];

    const clusters1km = computeCriticalZoneClusters(alerts, 1000);
    assert.equal(clusters1km.length, 1);
    assert.equal(clusters1km[0].alertsCount, 3);

    const clusters200m = computeCriticalZoneClusters(alerts, 200);
    assert.equal(clusters200m.length, 1);
    assert.equal(clusters200m[0].alertsCount, 2);
  });
});
