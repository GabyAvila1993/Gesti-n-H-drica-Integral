import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { UrbanAlert } from '../../urban-channels/domain/urban-alert';
import {
  computeConvexHull,
  computeCriticalZoneClusters,
  haversineDistanceMeters,
} from './spatial-clustering';

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

describe('spatial-clustering (Clustering Adaptativo DBSCAN y Envolvente)', () => {
  it('calcula correctamente la distancia geodésica en metros entre dos puntos de Capital', () => {
    const p1 = { lat: -32.8884, lng: -68.8562 };
    const p2 = { lat: -32.8888, lng: -68.8576 };
    const dist = haversineDistanceMeters(p1, p2);
    assert.ok(dist > 100 && dist < 200, `Distancia esperada ~140m, obtenida: ${dist}m`);
  });

  it('amolda dinámicamente el radio del círculo verde para envolver la extensión real de los puntos', () => {
    // 3 alertas distribuidas en unos ~440 metros de extremo a extremo
    const alerts: UrbanAlert[] = [
      makeAlert('a1', -32.8884, -68.8562, 'CRITICO'),
      makeAlert('a2', -32.8888, -68.8576, 'CRITICO'),
      makeAlert('a3', -32.8902, -68.8531, 'MEDIO'),
    ];

    const clusters = computeCriticalZoneClusters(alerts);
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].alertsCount, 3);
    assert.ok(
      clusters[0].spanMeters >= 380 && clusters[0].spanMeters <= 500,
      `La extensión entre extremos debe ser ~440m, obtenida: ${clusters[0].spanMeters}m`,
    );
    assert.ok(
      clusters[0].radiusMeters >= 210 && clusters[0].radiusMeters <= 310,
      `El radio envolvente debe ajustarse a la mitad de la extensión + margen (~255m), obtenido: ${clusters[0].radiusMeters}m`,
    );
    assert.equal(clusters[0].convexHull.length, 3);
  });

  it('calcula la envolvente convexa (Convex Hull) para un grupo de alertas', () => {
    const hull = computeConvexHull([
      { lat: -32.888, lng: -68.858 },
      { lat: -32.892, lng: -68.858 },
      { lat: -32.892, lng: -68.852 },
      { lat: -32.888, lng: -68.852 },
      { lat: -32.890, lng: -68.855 }, // punto interior
    ]);
    assert.equal(hull.length, 4, 'El punto interior no debe formar parte del borde del Convex Hull');
  });
});
