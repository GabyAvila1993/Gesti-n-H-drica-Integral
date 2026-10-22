import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyMndwi } from './mndwi-classifier';

describe('classifyMndwi', () => {
  const thresholds = { leak: 0.2, medium: 0.3, critical: 0.4 };

  it('devuelve null para humedad normal', () => {
    assert.equal(classifyMndwi(-0.35, thresholds), null);
    assert.equal(classifyMndwi(0.19, thresholds), null);
  });

  it('clasifica BAJO, MEDIO y CRITICO en los límites', () => {
    assert.equal(classifyMndwi(0.2, thresholds), 'BAJO');
    assert.equal(classifyMndwi(0.3, thresholds), 'MEDIO');
    assert.equal(classifyMndwi(0.4, thresholds), 'CRITICO');
    assert.equal(classifyMndwi(0.75, thresholds), 'CRITICO');
  });

  it('rechaza umbrales mal ordenados', () => {
    assert.throws(() => classifyMndwi(0.1, { leak: 0.5, medium: 0.3, critical: 0.4 }));
  });
});
