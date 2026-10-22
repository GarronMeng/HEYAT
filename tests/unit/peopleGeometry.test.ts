import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createFigureGeometry } from '../../src/render/people';
import type { Assets } from '../../src/render/assets';

describe('procedural hotel characters', () => {
  it('merges mixed primitive geometries for every role and leg', () => {
    const soft = new RoundedBoxGeometry(1, 1, 1, 2, 0.06);
    const sphere = new T.SphereGeometry(0.5, 12, 8);
    const cylinder = new T.CylinderGeometry(0.5, 0.5, 1, 16);
    const geometries = {
      soft,
      sphere,
      cylinder,
    } as unknown as Assets['geometries'];

    try {
      for (const role of [
        'reception',
        'porter',
        'housekeeping',
        'guest',
      ] as const) {
        for (const leg of [false, true]) {
          const merged = createFigureGeometry({ geometries }, role, leg);
          expect(merged.getIndex()).toBeNull();
          const positions = merged.getAttribute('position');
          const colors = merged.getAttribute('color');
          expect(positions.count).toBeGreaterThan(0);
          expect(colors.count).toBe(positions.count);
          expect(merged.getAttribute('normal').count).toBe(positions.count);
          merged.dispose();
        }
      }
    } finally {
      soft.dispose();
      sphere.dispose();
      cylinder.dispose();
    }
  });
});
