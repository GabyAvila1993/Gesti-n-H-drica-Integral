import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateObstruction,
  classifyObstructionRisk,
} from './obstruction-calculator';
import type { DetectedObject } from '../domain/detection';

describe('obstruction-calculator', () => {
  it('clasifica correctamente los umbrales BAJO (<25), MEDIO (25-60) y CRITICO (>60)', () => {
    assert.equal(classifyObstructionRisk(0), 'BAJO');
    assert.equal(classifyObstructionRisk(24), 'BAJO');
    assert.equal(classifyObstructionRisk(25), 'MEDIO');
    assert.equal(classifyObstructionRisk(60), 'MEDIO');
    assert.equal(classifyObstructionRisk(61), 'CRITICO');
    assert.equal(classifyObstructionRisk(92), 'CRITICO');
  });

  it('devuelve 0% y riesgo BAJO cuando no hay objetos detectados', () => {
    const result = calculateObstruction([]);
    assert.equal(result.obstructionPercentage, 0);
    assert.equal(result.riskLevel, 'BAJO');
    assert.equal(result.summary.plasticCount, 0);
  });

  it('calcula riesgo CRITICO cuando múltiples objetos cubren gran parte del cauce', () => {
    const detections: DetectedObject[] = [
      {
        id: '1',
        label: 'Rama seca de plátano',
        category: 'branch',
        confidence: 96,
        bbox: { top: 20, left: 12, width: 42, height: 30 },
      },
      {
        id: '2',
        label: 'Escombro de hormigón',
        category: 'debris',
        confidence: 94,
        bbox: { top: 45, left: 48, width: 32, height: 28 },
      },
    ];
    const result = calculateObstruction(detections);
    assert.equal(result.riskLevel, 'CRITICO');
    assert.ok(result.obstructionPercentage > 60);
    assert.equal(result.summary.branchCount, 1);
    assert.equal(result.summary.debrisCount, 1);
  });
});
